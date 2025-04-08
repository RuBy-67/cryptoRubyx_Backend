const db = require('../database');
const bcrypt = require('bcrypt');
const walletService = require('./walletService');
const apiKeyService = require('./apiKeyService');

class UserService {
    async getUserProfile(userId) {
        try {
            // Récupérer les informations de base de l'utilisateur
            const user = await db.getAsync(
                'SELECT id, username, email, created_at FROM users WHERE id = ?',
                [userId]
            );

            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            // Récupérer les wallets de l'utilisateur
            const wallets = await walletService.getUserWallets(userId);

            // Récupérer les clés API de l'utilisateur
            const apiKeys = await apiKeyService.getUserApiKeys(userId);

            return {
                user,
                wallets,
                apiKeys
            };
        } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, userData) {
        try {
            const { username, email, currentPassword, newPassword } = userData;
            
            // Vérifier si l'utilisateur existe
            const user = await db.getAsync(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );

            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            // Si un nouveau mot de passe est fourni, vérifier l'ancien mot de passe
            if (newPassword) {
                if (!currentPassword) {
                    throw new Error('Le mot de passe actuel est requis');
                }

                const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
                if (!validPassword) {
                    throw new Error('Mot de passe actuel incorrect');
                }
            }

            // Vérifier si le nom d'utilisateur ou l'email existe déjà
            if (username || email) {
                const existingUser = await db.getAsync(
                    'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
                    [username || '', email || '', userId]
                );

                if (existingUser) {
                    throw new Error('Nom d\'utilisateur ou email déjà utilisé');
                }
            }

            // Construire la requête de mise à jour
            let updateFields = [];
            let updateValues = [];

            if (username) {
                updateFields.push('username = ?');
                updateValues.push(username);
            }

            if (email) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }

            if (newPassword) {
                const passwordHash = await bcrypt.hash(newPassword, 10);
                updateFields.push('password_hash = ?');
                updateValues.push(passwordHash);
            }

            if (updateFields.length > 0) {
                updateValues.push(userId);
                await db.runAsync(
                    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                    updateValues
                );
            }

            // Retourner le profil mis à jour
            return await this.getUserProfile(userId);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            // Supprimer d'abord toutes les données associées
            await db.runAsync('DELETE FROM wallet_token WHERE wallet_id IN (SELECT id FROM wallet WHERE user_id = ?)', [userId]);
            await db.runAsync('DELETE FROM wallet WHERE user_id = ?', [userId]);
            await db.runAsync('DELETE FROM ApiKey WHERE user_id = ?', [userId]);
            
            // Supprimer l'utilisateur
            const result = await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);

            if (result.changes === 0) {
                throw new Error('Utilisateur non trouvé');
            }

            return { message: 'Compte utilisateur et toutes les données associées supprimés avec succès' };
        } catch (error) {
            console.error('Erreur lors de la suppression du compte:', error);
            throw error;
        }
    }
}

module.exports = new UserService(); 
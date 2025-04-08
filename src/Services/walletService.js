const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class WalletService {
    constructor() {
        this.supportedTypes = ['ETH', 'SOL', 'COSMOS', 'BSC'];
    }

    async addWallet(userId, walletData) {
        try {
            const { name, address, type } = walletData;

            // Vérifier si le type est supporté
            if (!this.supportedTypes.includes(type)) {
                throw new Error('Type de wallet non supporté');
            }

            // Vérifier si l'adresse existe déjà pour cet utilisateur
            const existingWallet = await db.getAsync(
                'SELECT id FROM wallet WHERE user_id = ? AND address = ?',
                [userId, address]
            );

            if (existingWallet) {
                throw new Error('Cette adresse de wallet existe déjà');
            }

            const walletId = uuidv4();

            await db.runAsync(
                'INSERT INTO wallet (id, user_id, name, address, type) VALUES (?, ?, ?, ?, ?)',
                [walletId, userId, name, address, type]
            );

            return {
                id: walletId,
                name,
                address,
                type
            };
        } catch (error) {
            console.error('Erreur lors de l\'ajout du wallet:', error);
            throw error;
        }
    }

    async getUserWallets(userId) {
        try {
            const wallets = await db.allAsync(
                'SELECT * FROM wallet WHERE user_id = ?',
                [userId]
            );
            return wallets;
        } catch (error) {
            console.error('Erreur lors de la récupération des wallets:', error);
            throw error;
        }
    }

    async getWalletById(walletId, userId) {
        try {
            const wallet = await db.getAsync(
                'SELECT * FROM wallet WHERE id = ? AND user_id = ?',
                [walletId, userId]
            );
            return wallet;
        } catch (error) {
            console.error('Erreur lors de la récupération du wallet:', error);
            throw error;
        }
    }

    async deleteWallet(walletId, userId) {
        try {
            // Supprimer d'abord les tokens associés
            await db.runAsync(
                'DELETE FROM wallet_token WHERE wallet_id = ?',
                [walletId]
            );

            // Puis supprimer le wallet
            const result = await db.runAsync(
                'DELETE FROM wallet WHERE id = ? AND user_id = ?',
                [walletId, userId]
            );

            return result.changes > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression du wallet:', error);
            throw error;
        }
    }

    async updateWallet(userId, walletId, walletData) {
        try {
            const { name, type } = walletData;

            // Vérifier si le wallet existe
            await this.getWalletById(walletId, userId);

            // Vérifier si le type est supporté
            if (type && !this.supportedTypes.includes(type)) {
                throw new Error('Type de wallet non supporté');
            }

            const result = await db.runAsync(
                'UPDATE wallet SET name = ?, type = ? WHERE id = ? AND user_id = ?',
                [name, type, walletId, userId]
            );

            if (result.changes === 0) {
                throw new Error('Wallet non trouvé');
            }

            return await this.getWalletById(walletId, userId);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du wallet:', error);
            throw error;
        }
    }

    async createWallet(userId, walletData) {
        try {
            const result = await db.runAsync(
                'INSERT INTO wallet (user_id, name, address, type) VALUES (?, ?, ?, ?)',
                [userId, walletData.name, walletData.address, walletData.type]
            );
            
            const wallet = await this.getWalletById(result.lastID, userId);
            return wallet;
        } catch (error) {
            console.error('Erreur lors de la création du wallet:', error);
            throw error;
        }
    }

    async updateWalletTokens(walletId, tokens) {
        try {
            // Commencer une transaction
            await db.runAsync('BEGIN TRANSACTION');

            // Supprimer les anciens tokens
            await db.runAsync(
                'DELETE FROM wallet_token WHERE wallet_id = ?',
                [walletId]
            );

            // Insérer les nouveaux tokens
            for (const token of tokens) {
                await db.runAsync(
                    `INSERT INTO wallet_token (
                        wallet_id,
                        contract_address,
                        name,
                        symbol,
                        decimals,
                        balance,
                        last_update
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        walletId,
                        token.contractAddress,
                        token.tokenName,
                        token.tokenSymbol,
                        token.decimals,
                        token.balance,
                        token.lastUpdate
                    ]
                );
            }

            // Valider la transaction
            await db.runAsync('COMMIT');
        } catch (error) {
            // En cas d'erreur, annuler la transaction
            await db.runAsync('ROLLBACK');
            console.error('Erreur lors de la mise à jour des tokens:', error);
            throw error;
        }
    }

    async getWalletTokens(walletId) {
        try {
            const tokens = await db.allAsync(
                'SELECT * FROM wallet_token WHERE wallet_id = ?',
                [walletId]
            );
            return tokens;
        } catch (error) {
            console.error('Erreur lors de la récupération des tokens:', error);
            throw error;
        }
    }

    getSupportedTypes() {
        return this.supportedTypes;
    }
}

module.exports = new WalletService(); 
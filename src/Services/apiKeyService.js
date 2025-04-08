const db = require('../database');
const { encrypt, decrypt } = require('../utils/encryption');

class ApiKeyService {
    constructor() {
    }

    async addApiKey(userId, apiData) {
        try {
            const {key, service} = apiData;
          
            
          
            // Vérifier si une clé existe déjà pour ce service
            const existingKey = await db.getAsync(
                'SELECT service FROM ApiKey WHERE user_id = ? AND service = ?',
                [userId, service]
            );

            if (existingKey) {
                throw new Error(`Une clé API existe déjà pour ${service}`);
            }

            // Chiffrer la clé
            const encryptedKey = encrypt(key);

            // Ajouter la clé
            await db.runAsync(
                'INSERT INTO ApiKey (user_id, service, encrypted_key, label) VALUES (?, ?, ?, ?)',
                [userId, service, encryptedKey, service]
            );

            return { service, label: service };
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la clé API:', error);
            throw error;
        }
    }

    async getApiKey(userId, service) {
        try {
            const apiKey = await db.getAsync(
                'SELECT service, encrypted_key, label FROM ApiKey WHERE user_id = ? AND service = ?',
                [userId, service]
            );

            if (!apiKey) {
                throw new Error(`Aucune clé API trouvée pour ${service}`);
            }

            const decryptedKey = decrypt(apiKey.encrypted_key);
            return {
                service: apiKey.service,
                key: decryptedKey,
                label: apiKey.label
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de la clé API:', error);
            throw error;
        }
    }

    async getUserApiKeys(userId) {
        try {
            const apiKeys = await db.allAsync(
                'SELECT service, label, created_at FROM ApiKey WHERE user_id = ?',
                [userId]
            );

            return apiKeys;
        } catch (error) {
            console.error('Erreur lors de la récupération des clés API:', error);
            throw error;
        }
    }

    async updateApiKey(userId, service, newKey) {
        try {
            const encryptedKey = encrypt(newKey);

            const result = await db.runAsync(
                'UPDATE ApiKey SET encrypted_key = ? WHERE user_id = ? AND service = ?',
                [encryptedKey, userId, service]
            );

            if (result.changes === 0) {
                throw new Error(`Aucune clé API trouvée pour ${service}`);
            }

            return { service, message: 'Clé API mise à jour avec succès' };
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la clé API:', error);
            throw error;
        }
    }

    async deleteApiKey(userId, service) {
        console.log(userId, service);
        try {
            const result = await db.runAsync(
                'DELETE FROM ApiKey WHERE user_id = ? AND service = ?',
                [userId, service]
            );

            if (result.changes === 0) {
                throw new Error(`Aucune clé API trouvée pour ${service}`);
            }

            return { service, message: 'Clé API supprimée avec succès' };
        } catch (error) {
            console.error('Erreur lors de la suppression de la clé API:', error);
            throw error;
        }
    }

    async checkApiKeyExists(userId, service) {
        try {
            const apiKey = await db.getAsync(
                'SELECT service FROM ApiKey WHERE user_id = ? AND service = ?',
                [userId, service]
            );

            return !!apiKey;
        } catch (error) {
            console.error('Erreur lors de la vérification de la clé API:', error);
            throw error;
        }
    }

}

module.exports = new ApiKeyService(); 
const db = require('../database');

class PortfolioHistoryService {
    /**
     * Enregistre la valeur totale du portfolio pour un utilisateur à la date d'aujourd'hui
     * si elle n'existe pas déjà
     */
    static async recordDailyValue(userId, totalValue) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Vérifier si une entrée existe déjà pour aujourd'hui
            const existingEntry = await db.getAsync(
                'SELECT id FROM portfolio_history WHERE user_id = ? AND date = ?',
                [userId, today]
            );

            // Si aucune entrée n'existe pour aujourd'hui, on l'ajoute
            if (!existingEntry) {
                await db.runAsync(
                    'INSERT INTO portfolio_history (user_id, total_value, date) VALUES (?, ?, ?)',
                    [userId, totalValue, today]
                );
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de l\'historique du portfolio:', error);
            throw error;
        }
    }

    /**
     * Récupère l'historique des valeurs du portfolio pour un utilisateur
     * pour les 7 derniers jours
     */
    static async getLastSevenDays(userId) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const formattedDate = sevenDaysAgo.toISOString().split('T')[0];

            const history = await db.allAsync(
                `SELECT date, total_value 
                FROM portfolio_history 
                WHERE user_id = ? AND date >= ? 
                ORDER BY date ASC`,
                [userId, formattedDate]
            );

            // Créer un tableau avec les 7 derniers jours
            const result = {
                labels: [],
                values: []
            };

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const formattedDate = date.toISOString().split('T')[0];
                
                const entry = history.find(h => h.date === formattedDate);
                result.labels.push(formattedDate);
                result.values.push(entry ? entry.total_value : null);
            }

            return result;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique du portfolio:', error);
            throw error;
        }
    }
}

module.exports = PortfolioHistoryService; 
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const moralisService = require('../Services/API/moralisService');
const PortfolioHistoryService = require('../Services/portfolioHistoryService');

// Récupérer tous les wallets d'un utilisateur
router.get('/', authenticateToken, async (req, res) => {
    try {
        const wallets = await db.allAsync(
            'SELECT * FROM wallet WHERE user_id = ?',
            [req.user.id]
        );
        res.json(wallets);
    } catch (error) {
        console.error('Erreur lors de la récupération des wallets:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les données d'un wallet spécifique
router.get('/balance/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer le wallet
        const wallet = await db.getAsync(
            'SELECT * FROM wallet WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet non trouvé' });
        }

        // Récupérer les données en fonction de la chaîne
        let walletData;
        if (wallet.chain === 'SOLANA') {
            // Utiliser directement getSolanaWalletData pour Solana
            walletData = await moralisService.getSolanaWalletData(wallet.address);
        } else {
            // Utiliser getWalletData pour les autres chaînes
            walletData = await moralisService.getWalletData(wallet.address, wallet.chain);
        }
        

        // Mettre à jour les données dans la base de données
        await db.runAsync(
            'UPDATE wallet SET data = ? WHERE id = ?',
            [JSON.stringify(walletData), id]
        );

        res.json(walletData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données du wallet:', error);
        res.status(500).json({ 
            message: 'Erreur serveur',
            error: error.message 
        });
    }
});

// Ajouter un nouveau wallet
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { address, chain, name } = req.body;

        if (!address || !chain || !name) {
            return res.status(400).json({ 
                message: 'Adresse et chaîne requises',
                received: { address, chain }
            });
        }

        // Vérifier si la chaîne est supportée
        const supportedChains = moralisService.getSupportedChains();

        if (!supportedChains.find(c => c.id === chain)) {
            return res.status(400).json({ 
                message: 'Chaîne non supportée',
                supportedChains: supportedChains.map(c => c.id)
            });
        }

        // Vérifier si le wallet existe déjà
        const existingWallet = await db.getAsync(
            'SELECT * FROM wallet WHERE user_id = ? AND address = ? AND chain = ?',
            [req.user.id, address, chain]
        );

        if (existingWallet) {
            return res.status(400).json({ message: 'Ce wallet existe déjà' });
        }

        // Créer le wallet
        const walletId = uuidv4();
        await db.runAsync(
            'INSERT INTO wallet (id, name, user_id, address, chain, data) VALUES (?, ?, ?, ?, ?, ?)',
            [walletId, name, req.user.id, address, chain, 'empty']
        );

        res.status(201).json({
            id: walletId,
            name,
            address,
            chain,
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du wallet:', error);
        res.status(500).json({ 
            message: 'Erreur serveur',
            error: error.message 
        });
    }
});

// Supprimer un wallet
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier si le wallet appartient à l'utilisateur
        const wallet = await db.getAsync(
            'SELECT * FROM wallet WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet non trouvé' });
        }

        await db.runAsync('DELETE FROM wallet WHERE id = ?', [id]);
        res.json({ message: 'Wallet supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du wallet:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour enregistrer la valeur du portfolio
router.post('/portfolio-history', authenticateToken, async (req, res) => {
    try {
        const { totalValue } = req.body;
        const userId = req.user.id;

        if (!totalValue || isNaN(totalValue)) {
            return res.status(400).json({ error: 'La valeur totale est requise et doit être un nombre' });
        }

        const recorded = await PortfolioHistoryService.recordDailyValue(userId, totalValue);
        res.json({ success: true, recorded });
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'historique:', error);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'historique' });
    }
});

// Route pour récupérer l'historique du portfolio
router.get('/portfolio-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await PortfolioHistoryService.getLastSevenDays(userId);
        res.json(history);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
    }
});

module.exports = router; 
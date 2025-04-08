const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const apiKeyService = require('../services/apiKeyService');

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// Obtenir toutes les clés API de l'utilisateur
router.get('/', async (req, res) => {
    try {
        const apiKeys = await apiKeyService.getUserApiKeys(req.user.id);
        res.json(apiKeys);
    } catch (error) {
        console.error('Erreur lors de la récupération des clés API:', error);
        res.status(500).json({ message: error.message });
    }
});

// Ajouter une nouvelle clé API
router.post('/', async (req, res) => {
    try {
        const { key, service } = req.body;
        
        if (!key) {
            return res.status(400).json({ message: 'La clé API est requise' });
        }

        const result = await apiKeyService.addApiKey(req.user.id, { key, service });
        res.status(201).json(result);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la clé API:', error);
        res.status(400).json({ message: error.message });
    }
});

// Mettre à jour une clé API
router.put('/:service', async (req, res) => {
    try {
        const { service } = req.params;
        const { key } = req.body;
        const result = await apiKeyService.updateApiKey(req.user.id, service, key);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Supprimer une clé API
router.delete('/:id', async (req, res) => {
    console.log('id', req.params.id);
    try {
        await apiKeyService.deleteApiKey(req.user.id, req.params.id);
        res.json({ message: 'Clé API supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la clé API:', error);
        res.status(400).json({ message: error.message });
    }
});

// Vérifier si une clé API existe
router.get('/check/:service', async (req, res) => {
    try {
        const { service } = req.params;
        const exists = await apiKeyService.checkApiKeyExists(req.user.id, service);
        res.json({ exists });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 
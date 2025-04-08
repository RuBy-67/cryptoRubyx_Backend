const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userService = require('../services/userService');

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// Récupérer le profil complet de l'utilisateur
router.get('/', async (req, res) => {
    try {
        const profile = await userService.getUserProfile(req.user.id);
        res.json(profile);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Mettre à jour le profil de l'utilisateur
router.put('/', async (req, res) => {
    try {
        const updatedProfile = await userService.updateUserProfile(req.user.id, req.body);
        res.json(updatedProfile);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Supprimer le compte utilisateur
router.delete('/', async (req, res) => {
    try {
        const result = await userService.deleteUser(req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 
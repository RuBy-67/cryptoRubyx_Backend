const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// Route d'inscription
router.post('/register', async (req, res) => {
    try {
        const userData = req.body;
        const newUser = await authService.register(userData);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route de connexion
router.post('/login', async (req, res) => {
    try {
        const credentials = req.body;
        console.log('Tentative de connexion avec les données:', {
            email: credentials.email,
            password: '********' // On ne log pas le mot de passe pour des raisons de sécurité
        });
        const authData = await authService.login(credentials);
        console.log('Connexion réussie pour l\'utilisateur:', authData.user?.email || 'inconnu');
        res.json(authData);
    } catch (error) {
        console.error('Échec de la connexion:', error.message);
        res.status(401).json({ error: error.message });
    }
});

// Route de vérification du token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token non fourni' });
        }

        const userData = await authService.verifyToken(token);
        res.json(userData);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

module.exports = router; 
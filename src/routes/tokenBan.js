const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const tokenBanService = require('../services/tokenBanService');
const db = require('../database');

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);
// Route pour récupérer les tokens bannis avec pagination et recherche
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = await tokenBanService.getAllBannedTokens(page, limit, search);
    res.json(result);
  } catch (error) {
    console.error('Erreur route token ban:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des tokens bannis',
      details: error.message 
    });
  }
});

// Route pour ajouter un token banni
router.post('/', async (req, res) => {
  try {
    const { address, name, symbol, reason } = req.body;
    const id = await tokenBanService.addBannedToken(address, name, symbol, reason);
    
    // Récupérer le token créé pour le renvoyer
    const query = 'SELECT * FROM token_ban WHERE id = ?';
    const token = await db.getAsync(query, [id]);
    
    res.status(201).json(token);
  } catch (error) {
    console.error('Erreur route token ban:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du token banni' });
  }
});

// Route pour supprimer un token banni
router.delete('/:id', async (req, res) => {
  try {
    await tokenBanService.deleteBannedToken(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Erreur route token ban:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du token banni' });
  }
});

// Route pour mettre à jour un token banni
router.put('/:id', async (req, res) => {
  try {
    await tokenBanService.updateBannedToken(req.params.id, req.body);
    res.status(204).send();
  } catch (error) {
    console.error('Erreur route token ban:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du token banni' });
  }
});

module.exports = router; 
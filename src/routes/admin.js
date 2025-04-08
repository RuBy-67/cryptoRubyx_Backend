const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const os = require('os');
const db = require('../database');

// Middleware pour vérifier l'authentification et les droits admin
router.use(authenticateToken, isAdmin);

// Statistiques système
router.get('/stats/system', async (req, res) => {
  try {
    const stats = {
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuUsage: os.loadavg(),
      platform: os.platform(),
      hostname: os.hostname()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques système' });
  }
});

// Liste des utilisateurs
router.get('/users', async (req, res) => {
  try {
    const users = await db.allAsync('SELECT id as _id, username, email, created_at as createdAt FROM users');
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Créer un utilisateur
router.post('/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await db.runAsync(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, password]
    );
    const newUser = await db.getAsync(
      'SELECT id as _id, username, email, created_at as createdAt FROM users WHERE id = ?',
      [result.lastID]
    );
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// Modifier un utilisateur
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;
    await db.runAsync(
      'UPDATE users SET username = ?, email = ? WHERE id = ?',
      [username, email, id]
    );
    const updatedUser = await db.getAsync(
      'SELECT id as _id, username, email, created_at as createdAt FROM users WHERE id = ?',
      [id]
    );
    res.json(updatedUser);
  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur' });
  }
});

// Supprimer un utilisateur
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// Liste des wallets
router.get('/wallets', async (req, res) => {
  try {
    const wallets = await db.allAsync(`
      SELECT 
        w.id as _id,
        w.address,
        w.balance,
        u.id as 'user._id',
        u.username as 'user.username',
        u.email as 'user.email',
        u.created_at as 'user.createdAt'
      FROM wallets w
      JOIN users u ON w.user_id = u.id
    `);
    res.json(wallets);
  } catch (error) {
    console.error('Erreur lors de la récupération des wallets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des wallets' });
  }
});

// Historique des portfolios
router.get('/portfolio-history', async (req, res) => {
  try {
    const history = await db.allAsync(`
      SELECT 
        ph.id as _id,
        ph.total_value as totalValue,
        ph.created_at as createdAt,
        u.id as 'user._id',
        u.username as 'user.username',
        u.email as 'user.email',
        u.created_at as 'user.createdAt'
      FROM portfolio_history ph
      JOIN users u ON ph.user_id = u.id
      ORDER BY ph.created_at DESC
    `);
    res.json(history);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique des portfolios' });
  }
});

module.exports = router; 
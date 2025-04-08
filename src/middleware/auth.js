const authService = require('../services/authService');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token non fourni' });
    }

    const userData = await authService.verifyToken(token);
    req.user = userData;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
}

async function isAdmin(req, res, next) {
  try {
    if (!req.user || req.user.email !== 'admin@cryptorubyx.local') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Erreur de vérification admin' });
  }
}

module.exports = {
  authenticateToken,
  isAdmin
}; 
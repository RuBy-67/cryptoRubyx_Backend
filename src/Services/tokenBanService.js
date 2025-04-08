const db = require('../database');

class TokenBanService {
  async getAllBannedTokens(page = 1, limit = 10, search = '') {
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM token_ban';
      let countQuery = 'SELECT COUNT(*) as total FROM token_ban';
      const params = [];

      if (search) {
        query += ' WHERE name LIKE ? OR symbol LIKE ? OR address LIKE ?';
        countQuery += ' WHERE name LIKE ? OR symbol LIKE ? OR address LIKE ?';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [tokens, countResult] = await Promise.all([
        db.allAsync(query, params),
        db.getAsync(countQuery, search ? params.slice(0, 3) : [])
      ]);

      return {
        tokens: tokens || [],
        total: countResult.total || 0,
        page,
        totalPages: Math.ceil((countResult.total || 0) / limit)
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens bannis:', error);
      return {
        tokens: [],
        total: 0,
        page,
        totalPages: 0
      };
    }
  }

  async addBannedToken(address, name, symbol, reason) {
    try {
      const query = 'INSERT INTO token_ban (address, name, symbol, reason) VALUES (?, ?, ?, ?)';
      const result = await db.runAsync(query, [address, name, symbol, reason]);
      return result.lastID;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du token banni:', error);
      throw error;
    }
  }

  async deleteBannedToken(id) {
    try {
      const query = 'DELETE FROM token_ban WHERE id = ?';
      await db.runAsync(query, [id]);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du token banni:', error);
      throw error;
    }
  }

  async updateBannedToken(id, address, name, symbol, reason) {
    try {
      const query = 'UPDATE token_ban SET address = ?, name = ?, symbol = ?, reason = ? WHERE id = ?';
      await db.runAsync(query, [address, name, symbol, reason, id]);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du token banni:', error);
      throw error;
    }
  }

  async isTokenBanned(address) {
    try {
      const query = 'SELECT * FROM token_ban WHERE address = ?';
      const result = await db.getAsync(query, [address]);
      return !!result;
    } catch (error) {
      console.error('Erreur lors de la vérification du token banni:', error);
      return false;
    }
  }

  async getBannedTokensForDashboard() {
    try {
      const query = 'SELECT address FROM token_ban';
      const result = await db.allAsync(query);
      return result.map(token => token.address.toLowerCase());
    } catch (error) {
      console.error('Erreur lors de la récupération des adresses des tokens bannis:', error);
      return [];
    }
  }
}

module.exports = new TokenBanService(); 
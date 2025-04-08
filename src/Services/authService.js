const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthService {
    async register(userData) {
        try {
            const { username, email, password } = userData;

            // Vérifier si l'utilisateur existe déjà
            const existingUser = await db.getAsync(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existingUser) {
                throw new Error('Un utilisateur avec ce nom ou cet email existe déjà');
            }

            // Créer le nouvel utilisateur
            const userId = uuidv4();
            const passwordHash = await bcrypt.hash(password, 10);

            await db.runAsync(
                'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
                [userId, username, email, passwordHash]
            );

            return { userId, username, email };
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            throw error;
        }
    }

    async login(credentials) {
        try {
            const { username, password } = credentials;

            // Récupérer l'utilisateur
            const user = await db.getAsync(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            // Vérifier le mot de passe
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                throw new Error('Mot de passe incorrect');
            }

            // Générer le token JWT
            const token = jwt.sign(
                { 
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            };
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            throw error;
        }
    }

    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded;
        } catch (error) {
            throw new Error('Token invalide');
        }
    }
}

module.exports = new AuthService(); 
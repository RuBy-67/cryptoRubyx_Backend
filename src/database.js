const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const banBase = require('./utils/banBase.json');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Promisify les méthodes de la base de données
db.runAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

db.getAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, function (err, result) {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

db.allAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Fonction d'initialisation de la base de données
async function initializeDatabase() {
    try {
        // Table des utilisateurs
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table des clés API
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS ApiKey (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                service TEXT NOT NULL,
                encrypted_key TEXT NOT NULL,
                label TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Table des wallets
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS wallet (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                user_id TEXT NOT NULL,
                address TEXT NOT NULL,
                chain TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, address, chain)
            )
        `);

        // Supprimer la table si elle existe pour la recréer avec la bonne structure
        await db.runAsync('DROP TABLE IF EXISTS portfolio_history');
        
        // Table de l'historique du portfolio
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS portfolio_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                total_value DECIMAL(20,2) NOT NULL,
                date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, date)
            )
        `);    

        // Table des tokens bannis
        await db.runAsync('DROP TABLE IF EXISTS token_ban');
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS token_ban (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                name TEXT,
                symbol TEXT,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insertion des tokens bannis
        console.log('Initialisation de la liste des tokens bannis...');
        for (const token of banBase.tokens) {
            await db.runAsync(
                'INSERT INTO token_ban (address, name, symbol, reason) VALUES (?, ?, ?, ?)',
                [token.address, token.name, token.symbol, 'Token ajouté automatiquement depuis banBase.json']
            );
        }
        console.log(`${banBase.tokens.length} tokens bannis ajoutés à la base de données`);

        // Création de l'utilisateur Admin
        const adminExists = await db.getAsync(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            ['Admin', 'admin@cryptorubyx.local']
        );
        
        if (!adminExists) {
            const adminId = uuidv4();
            const adminPassword = 'admin123'; 
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            
            await db.runAsync(
                'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
                [adminId, 'Admin', 'admin@cryptorubyx.local', passwordHash]
            );
            
            console.log('Utilisateur Admin créé avec succès');
            console.log('Identifiants par défaut :');
            console.log('Username: Admin');
            console.log('Password: ' + adminPassword);
            console.log('IMPORTANT: Changez ce mot de passe en production !');
        } else {
            console.log('Utilisateur Admin existe déjà');
        }

        console.log('Base de données initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        throw error;
    }
}

// Initialiser la base de données au démarrage
initializeDatabase().catch(error => {
    console.error('Erreur fatale lors de l\'initialisation de la base de données:', error);
    process.exit(1);
});

module.exports = db; 
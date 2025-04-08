require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Import des routes
const authRoutes = require('./routes/auth');
const apiKeyRoutes = require('./routes/api-keys');
const profileRoutes = require('./routes/profile');
const walletRoutes = require('./routes/wallets');
const tokenBanRoutes = require('./routes/tokenBan');
const { initializeMoralis } = require('./config/moralis');
const adminRoutes = require('./routes/admin');
const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:443', 'https://cryptorubyx.rb-rubydev.fr','http://localhost:3000'], // Liste d'origines autorisées
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  



app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/keys', apiKeyRoutes);
//app.use('/api/objectives', objectivesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/token-ban', tokenBanRoutes); 
app.use('/api/admin', adminRoutes);

// Routes de base
app.get('/', (req, res) => {
  res.json({ message: 'API CryptoRubyx opérationnelle' });
});

const PORT = process.env.PORT || 3001;

// Fonction pour initialiser toutes les connexions
async function initializeConnections() {
    try {
        // Initialiser Moralis
        await initializeMoralis();
    } catch (error) {
        console.warn('⚠️ Attention : Moralis n\'a pas pu être initialisé:', error.message);
        console.warn('L\'application continuera de fonctionner avec des fonctionnalités limitées');
    }
    
    // On retourne toujours true car on veut que l'application démarre même sans Moralis
    return true;
}

// Démarrer le serveur
async function startServer() {
    await initializeConnections();
    
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur le port ${PORT}`);
    });
}

// Démarrer l'application
startServer(); 
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path'); // ← AJOUTEZ CETTE LIGNE EN HAUT
const connectDB = require('./config/database');

const authRoutes = require('./routes/auth');
const participantRoutes = require('./routes/participants');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload'); // Ajoutez cette ligne

const app = express();

// Connexion à MongoDB
connectDB();

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
app.use(cors({
  origin: '*',  // ⚠️ À CHANGER en production par votre domaine spécifique
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limite chaque IP à 100 requêtes par windowMs
});

app.use('/api/', limiter);

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (factures uploadées)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Route de santé
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route non trouvée' });
});

// Middleware de gestion des erreurs global
app.use((err, req, res, next) => {
    console.error('Erreur globale:', err.stack);
    res.status(500).json({
        message: 'Une erreur est survenue',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

module.exports = app;

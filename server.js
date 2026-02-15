require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('SIGTERM signal reçu: fermeture du serveur...');
    server.close(() => {
        console.log('Serveur arrêté');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal reçu: fermeture du serveur...');
    server.close(() => {
        console.log('Serveur arrêté');
        process.exit(0);
    });
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('SIGTERM signal reçu: fermeture du serveur...');
    server.close(() => {
        console.log('Serveur arrêté');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal reçu: fermeture du serveur...');
    server.close(() => {
        console.log('Serveur arrêté');
        process.exit(0);
    });
});

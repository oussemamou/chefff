require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
const Admin = require('./src/models/Admin');

const PORT = process.env.PORT || 5000;

// Fonction pour créer l'admin par défaut si inexistant
async function createDefaultAdmin() {
    try {
        // Attendre que la connexion MongoDB soit établie
        if (mongoose.connection.readyState !== 1) {
            console.log('⏳ Attente de la connexion MongoDB...');
            await new Promise(resolve => {
                if (mongoose.connection.readyState === 1) resolve();
                else mongoose.connection.once('open', resolve);
            });
        }

        // Vérifier si un admin existe déjà
        const adminExists = await Admin.findOne({ email: 'admin@tirage.ma' });
        
        if (!adminExists) {
            // Créer l'admin par défaut
            const admin = new Admin({
                email: 'admin@tirage.ma',
                password: 'admin123',
                role: 'super_admin'
            });
            
            await admin.save();
            console.log('✅ Admin par défaut créé avec succès !');
            console.log('   Email: admin@tirage.ma');
            console.log('   Mot de passe: admin123');
            console.log('   ⚠️  Changez ce mot de passe après la première connexion !');
        } else {
            console.log('ℹ️ Admin par défaut existe déjà');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'admin:', error.message);
        // Ne pas bloquer le démarrage du serveur si l'admin ne peut pas être créé
    }
}

const server = app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health\n`);
    
    // Lancer la création de l'admin après le démarrage du serveur
    createDefaultAdmin();
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('\n📥 SIGTERM signal reçu: fermeture du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n📥 SIGINT signal reçu: fermeture du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('❌ Exception non capturée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejet non géré:', reason);
    process.exit(1);
});

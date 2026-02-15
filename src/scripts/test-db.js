require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

const testConnection = async () => {
    try {
        console.log('🔄 Tentative de connexion à MongoDB Atlas...');
        console.log('URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Cache le mot de passe

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connexion réussie !');
        console.log('📊 Base de données:', mongoose.connection.name);

        // Vérifier les collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📚 Collections existantes:', collections.map(c => c.name));

        await mongoose.disconnect();
        console.log('🔌 Déconnecté');

    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
    }
    process.exit(0);
};

testConnection();
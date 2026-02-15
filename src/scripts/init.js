const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
// Correction du chemin d'importation - on monte d'un niveau seulement car on est dans src/scripts/
const Admin = require('../models/Admin');  // ../models au lieu de ../src/models

const initAdmin = async () => {
    try {
        console.log('Connexion à MongoDB...');
        console.log('URI:', process.env.MONGODB_URI); // Pour déboguer

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB');

        const adminCount = await Admin.countDocuments();

        if (adminCount === 0) {
            // Vérifier que les variables d'environnement existent
            if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
                throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env');
            }

            const admin = new Admin({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'super_admin'
            });

            await admin.save();
            console.log('✅ Admin créé avec succès :');
            console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
            console.log(`   Mot de passe: ${process.env.ADMIN_PASSWORD}`);
            console.log('   ⚠️  Changez ce mot de passe après la première connexion !');
        } else {
            console.log('ℹ️  Un admin existe déjà dans la base de données');

            // Afficher les admins existants
            const admins = await Admin.find({}, 'email role');
            console.log('Admins existants :');
            admins.forEach(admin => {
                console.log(`   - ${admin.email} (${admin.role})`);
            });
        }

        await mongoose.disconnect();
        console.log('✅ Déconnecté de MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.name === 'MongooseServerSelectionError') {
            console.error('   Vérifiez que MongoDB est bien démarré sur votre machine');
        }
        process.exit(1);
    }
};

// Exécuter le script
initAdmin();
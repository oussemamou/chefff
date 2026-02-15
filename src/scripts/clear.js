require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Participant = require('../models/Participant');

const clearDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB');

        const result = await Participant.deleteMany({});
        console.log(`🗑️ ${result.deletedCount} participants supprimés`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
        process.exit(0);
    }
};

clearDatabase();
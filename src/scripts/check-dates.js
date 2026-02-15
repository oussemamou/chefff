require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Participant = require('../models/Participant');

const checkDates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connecté à MongoDB\n');

        // Récupérer tous les participants
        const participants = await Participant.find({}).sort({ dateParticipation: -1 });

        console.log('=== Participants dans la base ===\n');

        participants.forEach((p, index) => {
            console.log(`${index + 1}. ${p.nom} ${p.prenom}`);
            console.log(`   Téléphone: ${p.telephone}`);
            console.log(`   Date participation (brute): ${p.dateParticipation}`);
            console.log(`   Date participation (locale): ${p.dateParticipation.toLocaleDateString('fr-FR')}`);
            console.log(`   Date participation (ISO): ${p.dateParticipation.toISOString()}`);
            console.log(`   Année: ${p.dateParticipation.getFullYear()}`);
            console.log(`   Mois: ${p.dateParticipation.getMonth() + 1}`);
            console.log(`   Jour: ${p.dateParticipation.getDate()}`);
            console.log('---');
        });

        // Tester les filtres
        console.log('\n=== Test des filtres ===\n');

        const testDate = new Date(2026, 2, 1); // 1er mars 2026
        console.log('Date de référence (1er mars 2026):', testDate);

        const avantMars = await Participant.countDocuments({
            dateParticipation: { $lt: testDate }
        });
        console.log('Participants avant 1er mars 2026:', avantMars);

        const apresMars = await Participant.countDocuments({
            dateParticipation: { $gte: testDate }
        });
        console.log('Participants après 1er mars 2026:', apresMars);

    } catch (error) {
        console.error('Erreur:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

checkDates();
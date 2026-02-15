const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true,
        maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
    },
    prenom: {
        type: String,
        required: [true, 'Le prénom est requis'],
        trim: true,
        maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
    },
    telephone: {
        type: String,
        required: [true, 'Le téléphone est requis'],
        unique: true,
        match: [/^[0-9]{8}$/, 'Veuillez entrer un numéro valide à 8 chiffres']
    },
    statut: {
        type: String,
        enum: ['en_attente', 'gagnant', 'perdant'],
        default: 'en_attente'
    },
    dateParticipation: {
        type: Date,
        default: Date.now
    },
    dateTirage: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index pour améliorer les performances des recherches
participantSchema.index({ telephone: 1 }, { unique: true });
participantSchema.index({ statut: 1 });
participantSchema.index({ dateParticipation: -1 });

module.exports = mongoose.model('Participant', participantSchema);
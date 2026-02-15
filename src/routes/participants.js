const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Soumettre une participation (public)
router.post('/', [
    body('nom').trim().notEmpty().withMessage('Le nom est requis'),
    body('prenom').trim().notEmpty().withMessage('Le prénom est requis'),
    body('telephone')
        .trim()
        .notEmpty().withMessage('Le téléphone est requis')
        .matches(/^[0-9]{8}$/).withMessage('Le téléphone doit contenir 8 chiffres')
], async (req, res) => {
    try {
        console.log('📥 Données reçues:', req.body);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Erreurs validation:', errors.array());
            return res.status(400).json({
                message: 'Erreur de validation',
                errors: errors.array()
            });
        }

        const { nom, prenom, telephone } = req.body;

        // Vérifier si le participant existe déjà
        const existingParticipant = await Participant.findOne({ telephone });

        if (existingParticipant) {
            return res.status(400).json({
                message: 'Ce numéro de téléphone est déjà inscrit'
            });
        }

        // Créer le participant
        const participant = new Participant({
            nom: nom.trim(),
            prenom: prenom.trim(),
            telephone: telephone.trim()
        });

        await participant.save();
        console.log('✅ Participant créé:', participant._id);

        res.status(201).json({
            message: 'Participation enregistrée avec succès',
            participant: {
                id: participant._id,
                nom: participant.nom,
                prenom: participant.prenom,
                statut: participant.statut
            }
        });

    } catch (error) {
        console.error('❌ Erreur création participant:', error);

        // Gestion des erreurs de duplication
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Ce numéro de téléphone est déjà utilisé'
            });
        }

        res.status(500).json({
            message: 'Erreur serveur'
        });
    }
});

// Récupérer tous les participants (admin uniquement)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 50, statut, search } = req.query;
        const query = {};

        if (statut) {
            query.statut = statut;
        }

        if (search) {
            query.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { prenom: { $regex: search, $options: 'i' } },
                { telephone: { $regex: search, $options: 'i' } }
            ];
        }

        const participants = await Participant.find(query)
            .sort({ dateParticipation: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Participant.countDocuments(query);

        res.json({
            participants,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Erreur récupération participants:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les statistiques (admin uniquement)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const total = await Participant.countDocuments();
        const enAttente = await Participant.countDocuments({ statut: 'en_attente' });
        const gagnants = await Participant.countDocuments({ statut: 'gagnant' });
        const perdants = await Participant.countDocuments({ statut: 'perdant' });

        const aujourdHui = new Date();
        aujourdHui.setHours(0, 0, 0, 0);

        const aujourdHuiCount = await Participant.countDocuments({
            dateParticipation: { $gte: aujourdHui }
        });

        res.json({
            total,
            enAttente,
            gagnants,
            perdants,
            aujourdHui: aujourdHuiCount
        });
    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Mettre à jour le statut d'un participant (admin uniquement)
router.patch('/:id/statut', authMiddleware, [
    body('statut').isIn(['en_attente', 'gagnant', 'perdant'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const participant = await Participant.findByIdAndUpdate(
            req.params.id,
            {
                statut: req.body.statut,
                dateTirage: req.body.statut !== 'en_attente' ? new Date() : null
            },
            { new: true }
        );

        if (!participant) {
            return res.status(404).json({ message: 'Participant non trouvé' });
        }

        res.json({
            message: 'Statut mis à jour',
            participant
        });
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Supprimer un participant (admin uniquement)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const participant = await Participant.findByIdAndDelete(req.params.id);

        if (!participant) {
            return res.status(404).json({ message: 'Participant non trouvé' });
        }

        res.json({ message: 'Participant supprimé' });
    } catch (error) {
        console.error('Erreur suppression participant:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;
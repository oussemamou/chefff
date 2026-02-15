const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Admin = require('../models/Admin');
const Participant = require('../models/Participant');
const { authMiddleware, isSuperAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Configuration multer pour l'import Excel
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté. Utilisez XLSX, XLS ou CSV'), false);
        }
    }
});

// ===== ROUTES EXISTANTES =====

// Changer le mot de passe (admin connecté)
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const admin = await Admin.findById(req.adminId);

        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({ message: 'Mot de passe modifié avec succès' });
    } catch (error) {
        console.error('Erreur changement mot de passe:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Créer un nouvel admin (super admin uniquement)
router.post('/create', authMiddleware, isSuperAdmin, async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Cet email existe déjà' });
        }

        const admin = new Admin({
            email,
            password,
            role: role || 'admin'
        });

        await admin.save();

        res.status(201).json({
            message: 'Admin créé avec succès',
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Erreur création admin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ===== ROUTES POUR LE TIRAGE =====

// Route pour obtenir le nombre de candidats par période
router.get('/candidats/periode', authMiddleware, async (req, res) => {
    try {
        const { periode } = req.query;
        let dateFilter = {};

        const aujourdHui = new Date();
        const annee = aujourdHui.getFullYear();
        const premierMars = new Date(annee, 2, 1); // 1er mars
        const trenteMars = new Date(annee, 2, 30); // 30 mars

        switch (periode) {
            case 'mars':
                dateFilter = {
                    dateParticipation: {
                        $gte: premierMars,
                        $lte: trenteMars
                    }
                };
                break;
            case 'avantMars':
                dateFilter = {
                    dateParticipation: {
                        $lt: premierMars
                    }
                };
                break;
            default:
                dateFilter = {};
        }

        const count = await Participant.countDocuments({
            ...dateFilter,
            statut: 'en_attente'
        });

        res.json({ count });
    } catch (error) {
        console.error('Erreur comptage candidats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour obtenir le nombre de candidats par période (basé sur dateAchat)
router.get('/candidats/periode', authMiddleware, async (req, res) => {
    try {
        const { periode, type = 'participation' } = req.query;
        let dateFilter = {};
        const dateField = type === 'achat' ? 'dateAchat' : 'dateParticipation';

        const aujourdHui = new Date();
        const annee = aujourdHui.getFullYear();
        const premierMars = new Date(annee, 2, 1); // 1er mars
        const trenteMars = new Date(annee, 2, 30); // 30 mars

        switch (periode) {
            case 'mars':
                dateFilter[dateField] = {
                    $gte: premierMars,
                    $lte: trenteMars
                };
                break;
            case 'avantMars':
                dateFilter[dateField] = {
                    $lt: premierMars
                };
                break;
            default:
                dateFilter = {};
        }

        const count = await Participant.countDocuments({
            ...dateFilter,
            statut: 'en_attente'
        });

        res.json({ count });
    } catch (error) {
        console.error('Erreur comptage candidats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour effectuer le tirage avec filtre par période (basé sur dateAchat)
router.post('/tirage', authMiddleware, async (req, res) => {
    try {
        const { nombre, mode, periode = 'all', type = 'participation' } = req.body;

        if (!nombre || nombre < 1) {
            return res.status(400).json({ message: 'Nombre de gagnants invalide' });
        }

        // Construire le filtre de date (soit sur dateAchat soit sur dateParticipation)
        let dateFilter = {};
        const dateField = type === 'achat' ? 'dateAchat' : 'dateParticipation';

        const aujourdHui = new Date();
        const annee = aujourdHui.getFullYear();
        const premierMars = new Date(annee, 2, 1); // 1er mars
        const trenteMars = new Date(annee, 2, 30); // 30 mars

        switch (periode) {
            case 'mars':
                dateFilter[dateField] = {
                    $gte: premierMars,
                    $lte: trenteMars
                };
                break;
            case 'avantMars':
                dateFilter[dateField] = {
                    $lt: premierMars
                };
                break;
            default:
                dateFilter = {};
        }

        // Compter le total des candidats dans la période
        const totalCandidates = await Participant.countDocuments({
            ...dateFilter,
            statut: 'en_attente'
        });

        if (totalCandidates < nombre) {
            return res.status(400).json({
                message: `Pas assez de participants dans cette période. Disponible: ${totalCandidates}`
            });
        }

        let gagnants = [];

        switch (mode) {
            case 'ancien':
                gagnants = await Participant.find({
                    ...dateFilter,
                    statut: 'en_attente'
                })
                    .sort({ [dateField]: 1 }) // Tri par dateAchat ou dateParticipation
                    .limit(nombre)
                    .select('-__v');
                break;

            case 'aleatoire':
            default:
                gagnants = await Participant.aggregate([
                    {
                        $match: {
                            ...dateFilter,
                            statut: 'en_attente'
                        }
                    },
                    { $sample: { size: nombre } },
                    { $project: { __v: 0 } }
                ]);
                break;
        }

        res.json({
            message: 'Tirage effectué',
            gagnants,
            totalCandidates
        });

    } catch (error) {
        console.error('Erreur tirage:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});


// Route pour valider les gagnants
router.post('/tirage/valider', authMiddleware, async (req, res) => {
    try {
        const { gagnantsIds } = req.body;

        if (!gagnantsIds || !Array.isArray(gagnantsIds) || gagnantsIds.length === 0) {
            return res.status(400).json({ message: 'Liste de gagnants invalide' });
        }

        // Mettre à jour le statut des gagnants
        const result = await Participant.updateMany(
            { _id: { $in: gagnantsIds } },
            {
                statut: 'gagnant',
                dateTirage: new Date()
            }
        );

        res.json({
            message: `${result.modifiedCount} gagnant(s) validé(s)`,
            gagnantsIds
        });

    } catch (error) {
        console.error('Erreur validation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour l'historique des tirages
router.get('/tirages/historique', authMiddleware, async (req, res) => {
    try {
        const historique = await Participant.aggregate([
            { $match: { statut: 'gagnant', dateTirage: { $ne: null } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateTirage" } },
                    gagnants: {
                        $push: {
                            _id: "$_id",
                            nom: "$nom",
                            prenom: "$prenom",
                            email: "$email",
                            telephone: "$telephone",
                            ville: "$ville",
                            modele: "$modele"
                        }
                    },
                    total: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 10 }
        ]);

        res.json(historique);
    } catch (error) {
        console.error('Erreur historique:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ===== ROUTES POUR L'IMPORT EXCEL =====

// Route d'import Excel
router.post('/import/excel', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier uploadé' });
        }

        console.log('Fichier reçu:', req.file.originalname);

        // Lire le fichier Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Enlever l'en-tête
        const headers = data[0];
        const rows = data.slice(1);

        console.log(`Traitement de ${rows.length} lignes...`);

        const results = {
            success: 0,
            errors: 0,
            total: rows.length,
            details: []
        };

        // Traiter chaque ligne
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 8) {
                results.errors++;
                results.details.push({ row: i, error: 'Ligne incomplète' });
                continue;
            }

            try {
                const [nom, prenom, telephone, email, ville, modele, imei, dateAchat] = row;

                // Validation basique
                if (!nom || !prenom || !telephone || !ville || !modele || !imei || !dateAchat) {
                    throw new Error('Champs obligatoires manquants');
                }

                // Nettoyer les valeurs
                const telephoneClean = telephone.toString().replace(/\s/g, '');
                const imeiClean = imei.toString().replace(/\s/g, '');

                // Validation téléphone (8 chiffres)
                if (!/^[0-9]{8}$/.test(telephoneClean)) {
                    throw new Error('Téléphone invalide (8 chiffres requis)');
                }

                // Validation IMEI (15 chiffres)
                if (!/^[0-9]{15}$/.test(imeiClean)) {
                    throw new Error('IMEI invalide (15 chiffres requis)');
                }

                // Validation email si fourni
                if (email && !/^\S+@\S+\.\S+$/.test(email)) {
                    throw new Error('Email invalide');
                }

                // Convertir la date Excel si nécessaire
                let dateAchatObj;
                if (typeof dateAchat === 'number') {
                    // Date Excel (nombre de jours depuis 1900)
                    const date = XLSX.SSF.parse_date_code(dateAchat);
                    dateAchatObj = new Date(date.y, date.m - 1, date.d);
                } else if (typeof dateAchat === 'string') {
                    dateAchatObj = new Date(dateAchat);
                    if (isNaN(dateAchatObj.getTime())) {
                        throw new Error('Format de date invalide');
                    }
                } else {
                    throw new Error('Format de date invalide');
                }

                // Vérifier si le participant existe déjà
                const existing = await Participant.findOne({
                    $or: [
                        { telephone: telephoneClean },
                        { imei: imeiClean }
                    ]
                });

                if (existing) {
                    let field = existing.telephone === telephoneClean ? 'téléphone' : 'IMEI';
                    throw new Error(`${field} déjà existant`);
                }

                // Créer le participant
                const participant = new Participant({
                    nom: nom.toString().trim(),
                    prenom: prenom.toString().trim(),
                    telephone: telephoneClean,
                    email: email ? email.toString().trim().toLowerCase() : undefined,
                    ville: ville.toString().trim(),
                    modele: modele.toString().trim(),
                    imei: imeiClean,
                    dateAchat: dateAchatObj,
                    factureUrl: '/uploads/imported/default.pdf',
                    factureNom: 'imported.xlsx'
                });

                await participant.save();
                results.success++;

            } catch (error) {
                results.errors++;
                results.details.push({
                    row: i + 2, // +2 pour tenir compte de l'en-tête et de l'index 0
                    error: error.message
                });
            }
        }

        console.log('Import terminé:', results);

        res.json({
            message: `Import terminé: ${results.success} succès, ${results.errors} erreurs`,
            ...results
        });

    } catch (error) {
        console.error('Erreur import Excel:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'import',
            error: error.message
        });
    }
});

// Route pour télécharger un template Excel
router.get('/import/template', authMiddleware, (req, res) => {
    try {
        const template = [
            ['nom', 'prenom', 'telephone', 'email', 'ville', 'modele', 'imei', 'dateAchat'],
            ['Dupont', 'Jean', '12345678', 'jean@email.com', 'Paris', 'iPhone 13', '123456789012345', '2024-03-15'],
            ['Martin', 'Marie', '87654321', 'marie@email.com', 'Lyon', 'Samsung S23', '987654321098765', '2024-03-10'],
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(template);
        XLSX.utils.book_append_sheet(wb, ws, 'Template');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=template_import_participants.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Erreur génération template:', error);
        res.status(500).json({ message: 'Erreur lors de la génération du template' });
    }
});

module.exports = router;
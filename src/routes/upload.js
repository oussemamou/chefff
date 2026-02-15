const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/factures');
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom unique pour le fichier
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'facture-' + uniqueSuffix + ext);
    }
});

// Filtre pour n'accepter que les images et PDF
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG ou PDF'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

// Route d'upload de facture
router.post('/facture', upload.single('facture'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier uploadé' });
        }

        // Construire l'URL du fichier
        const fileUrl = `/uploads/factures/${req.file.filename}`;

        res.json({
            message: 'Fichier uploadé avec succès',
            url: fileUrl,
            fileName: req.file.originalname
        });
    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({ message: 'Erreur lors de l\'upload' });
    }
});

// Route pour servir les fichiers statiques
router.get('/factures/:filename', (req, res) => {
    const filepath = path.join(__dirname, '../../uploads/factures', req.params.filename);
    res.sendFile(filepath);
});

module.exports = router;
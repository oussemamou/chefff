const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { body, validationResult } = require('express-validator');

// Route de connexion
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Vérifier si l'admin existe
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }

        // Vérifier le mot de passe
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }

        // Mettre à jour la dernière connexion
        admin.lastLogin = new Date();
        await admin.save();

        // Générer le token JWT
        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({
            message: 'Connexion réussie',
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route de création du premier admin (à utiliser une seule fois)
router.post('/setup', async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();

        if (adminCount > 0) {
            return res.status(400).json({ message: 'Un admin existe déjà' });
        }

        const admin = new Admin({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            role: 'super_admin'
        });

        await admin.save();
        res.json({ message: 'Admin créé avec succès' });
    } catch (error) {
        console.error('Erreur création admin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;
const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.adminId = decoded.id;
        req.adminRole = decoded.role;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Veuillez vous authentifier' });
    }
};

const isSuperAdmin = (req, res, next) => {
    if (req.adminRole !== 'super_admin') {
        return res.status(403).json({ message: 'Accès non autorisé' });
    }
    next();
};

module.exports = { authMiddleware, isSuperAdmin };
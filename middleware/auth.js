const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Доступ запрещен. Токен не предоставлен." });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; 

        next();
    } catch (err) {
        return res.status(401).json({ error: "Недействительный или просроченный токен." });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: "Доступ запрещен. Требуются права администратора чердака." });
    }
};

module.exports = { authMiddleware, isAdmin };
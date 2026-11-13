const { RequestLog } = require('../models');

const requestLogger = async (req, res, next) => {
    try {
        const requestLog = await RequestLog.create({
            method: req.method,
            url: req.originalUrl || req.url,
            requestedAt: new Date()
        });

        console.log(`📡 [LOG]: [${requestLog.requestedAt.toLocaleString('ru-RU')}] ${requestLog.method} ${requestLog.url}`);
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = requestLogger;
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
        console.error(
            `Не удалось записать запрос ${req.method} ${req.originalUrl || req.url} в таблицу логов:`,
            error.message
        );

        if (req.method === 'POST' && req.path === '/add') {
            return next(error);
        }

        next();
    }
};

module.exports = requestLogger;
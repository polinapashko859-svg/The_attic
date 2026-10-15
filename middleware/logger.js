const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'access.log');

const requestLogger = (req, res, next) => {
    const timestamp = new Date().toLocaleString('ru-RU');
    const method = req.method;
    const url = req.originalUrl || req.url;

    const logMessage = `[${timestamp}] ${method} ${url}\n`;

    console.log(`📡 [LOG]: ${logMessage.trim()}`);

    try {
        if (!fs.existsSync(logFilePath)) {
            fs.writeFileSync(logFilePath, `=== Журнал запросов "The Attic" (Вариант 19) ===\n`, 'utf8');
        }

        fs.appendFile(logFilePath, logMessage, 'utf8', (err) => {
            if (err) {
                console.error(`⚠️ ОШИБКА ЗАПИСИ В ФАЙЛ ЛОГОВ: ${err.message}`);
            }
        });
    } catch (error) {
        console.error(`❌ КРИТИЧЕСКИЙ СБОЙ ЛОГГЕРА: Не удалось открыть или создать access.log: ${error.message}`);
    }

    next(); 
};

module.exports = requestLogger;
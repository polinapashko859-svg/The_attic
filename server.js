require('dotenv').config();
const express = require('express');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, Sketch, Comment, Message } = require('./models');
const sketchRoutes = require('./routes/sketchRoutes');
const authRoutes = require('./routes/auth');
const requestLogger = require('./middleware/logger');
const authSimulation = require('./middleware/authSim');
const limits = require('./config/limits.json');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedPaperTypes = limits.paperTypes;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({
    extended: true,
    limit: limits.requestBodyLimit,
    parameterLimit: limits.requestParameterLimit
}));
app.use(express.json({ limit: limits.requestBodyLimit }));
app.use(requestLogger);
app.use(authSimulation);
app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.use('/auth', authRoutes);
app.use('/sketches', sketchRoutes);

const countWords = (text) => (text.match(/[\p{L}\p{N}]+/gu) || []).length;

const paperTypes = {
    parchment: { className: 'parchment', label: 'Пергамент' },
    kraft: { className: 'kraft', label: 'Крафт' },
    linen: { className: 'linen', label: 'Лён' },
    'pressed-flower': { className: 'pressed-flower', label: 'Сухоцветы' },
    'handmade-cotton': { className: 'linen', label: 'Хлопковая бумага' }
};

const withDisplayData = (record) => {
    const item = record.get ? record.get({ plain: true }) : { ...record };
    const createdAt = new Date(item.createdAt);
    const paperType = paperTypes[String(item.paperType || '').toLowerCase()] || paperTypes.parchment;
    item.createdAtLabel = `${createdAt.toLocaleString('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'medium'
    })}.${String(createdAt.getMilliseconds()).padStart(3, '0')} (№${item.id})`;
    item.readingMinutes = Math.max(1, Math.ceil(countWords(item.content || '') / limits.readingSpeedWpm));
    item.paperTypeClass = paperType.className;
    item.paperTypeLabel = paperType.label;
    return item;
};

const validateText = (value, rule) => {
    if (typeof value !== 'string') {
        return rule.errorMessage;
    }

    const trimmed = value.trim();
    if (trimmed.length < rule.minLength || trimmed.length > rule.maxLength) {
        return rule.errorMessage;
    }

    return null;
};

const renderAddForm = (res, status, error, formData) => res.status(status).render('add', {
    title: 'Добавить публикацию — The Attic',
    error,
    formData,
    readingSpeedWpm: limits.readingSpeedWpm
});

app.get('/', async (req, res, next) => {
    try {
        const sketches = await Sketch.findAll({
            include: [{ model: Comment, as: 'comments' }],
            order: [['createdAt', 'DESC'], ['id', 'DESC']]
        });

        res.render('index', {
            title: 'Главная — The Attic',
            items: sketches.map(withDisplayData)
        });
    } catch (error) {
        next(error);
    }
});

app.get('/add', (req, res) => {
    res.render('add', {
        title: 'Новая публикация — The Attic',
        error: null,
        formData: {},
        readingSpeedWpm: limits.readingSpeedWpm
    });
});

app.post('/add', async (req, res, next) => {
    const { title, author, paperType, content } = req.body;
    const imageUrl = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
    const formData = {
        title: typeof title === 'string' ? title.trim() : '',
        author: typeof author === 'string' ? author.trim() : '',
        paperType,
        content: typeof content === 'string' ? content.trim() : '',
        imageUrl
    };

    for (const [field, rule] of [
        ['title', limits.title],
        ['author', limits.author],
        ['content', limits.content]
    ]) {
        const error = validateText(formData[field], rule);
        if (error) {
            return renderAddForm(res, 400, error, formData);
        }
    }

    if (imageUrl.length > limits.imageUrl.maxLength) {
        return renderAddForm(res, 400, limits.imageUrl.errorMessage, formData);
    }
    if (imageUrl) {
        try {
            const parsedUrl = new URL(imageUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Unsupported URL protocol');
            }
        } catch {
            return renderAddForm(res, 400, limits.imageUrl.errorMessage, formData);
        }
    }
    if (!allowedPaperTypes.includes(paperType)) {
        return renderAddForm(res, 400, limits.paperTypeErrorMessage, formData);
    }

    try {
        const latestSketch = await Sketch.findOne({
            attributes: ['createdAt'],
            order: [['createdAt', 'DESC']]
        });
        const latestTime = latestSketch ? new Date(latestSketch.createdAt).getTime() + 1 : 0;
        const createdAt = new Date(Math.max(Date.now(), latestTime));

        await Sketch.create({
            ...formData,
            imageUrl: imageUrl || null,
            warmth: 1,
            readingTime: Math.max(1, Math.ceil(countWords(formData.content) / limits.readingSpeedWpm)),
            createdAt
        });
        res.redirect('/');
    } catch (error) {
        next(error);
    }
});

app.get('/item/:id', async (req, res, next) => {
    try {
        const item = await Sketch.findByPk(req.params.id, {
            include: [{
                model: Comment,
                as: 'comments',
                separate: true,
                order: [['createdAt', 'DESC']]
            }]
        });
        if (!item) {
            return next();
        }

        res.render('item', {
            title: `${item.title} — The Attic`,
            item: withDisplayData(item)
        });
    } catch (error) {
        next(error);
    }
});

app.post('/item/:id/comment', async (req, res, next) => {
    const author = typeof req.body.commentAuthor === 'string' ? req.body.commentAuthor.trim() : '';
    const text = typeof req.body.commentText === 'string' ? req.body.commentText.trim() : '';
    const authorError = validateText(author, limits.commentAuthor);
    const textError = validateText(text, limits.commentText);

    try {
        const item = await Sketch.findByPk(req.params.id, {
            include: [{
                model: Comment,
                as: 'comments',
                separate: true,
                order: [['createdAt', 'DESC']]
            }]
        });
        if (!item) {
            return next();
        }

        if (authorError || textError) {
            return res.status(400).render('item', {
                title: `${item.title} — The Attic`,
                item: withDisplayData(item),
                commentError: authorError || textError,
                commentDraft: { author, text }
            });
        }

        await Comment.create({ author, text, sketchId: item.id });
        res.redirect(`/item/${item.id}#comments`);
    } catch (error) {
        next(error);
    }
});

app.get('/messages', async (req, res, next) => {
    try {
        const activeUser = typeof req.query.user === 'string' && req.query.user.trim()
            ? req.query.user.trim().slice(0, limits.messageUser.maxLength)
            : 'Lydia';
        const currentUser = req.user.name;
        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { fromUser: currentUser, toUser: activeUser },
                    { fromUser: activeUser, toUser: currentUser }
                ]
            },
            order: [['createdAt', 'ASC']]
        });

        res.render('messages', {
            title: 'Сообщения — The Attic',
            activeUser,
            messages
        });
    } catch (error) {
        next(error);
    }
});

app.post('/messages/send', async (req, res, next) => {
    const toUser = typeof req.body.toUser === 'string' ? req.body.toUser.trim() : '';
    const messageText = typeof req.body.messageText === 'string' ? req.body.messageText.trim() : '';
    const userError = validateText(toUser, limits.messageUser);
    const messageError = validateText(messageText, limits.messageText);

    if (userError || messageError) {
        return res.status(400).send(userError || messageError);
    }

    try {
        await Message.create({
            fromUser: req.user.name,
            toUser,
            messageText
        });
        res.redirect(`/messages?user=${encodeURIComponent(toUser)}`);
    } catch (error) {
        next(error);
    }
});

app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 — Страница не найдена'
    });
});

app.use((err, req, res, next) => {
    const statusCode = Number.isInteger(err.status) && err.status >= 400 && err.status < 500
        ? err.status
        : 500;
    console.error(`💥 [ERROR ${statusCode}]: ${err.message}`);
    console.error(err.stack);

    if (res.headersSent) {
        return next(err);
    }

    if (statusCode !== 500) {
        const message = statusCode === 413
            ? 'Тело запроса слишком большое. Уменьшите размер данных и повторите попытку.'
            : 'Некорректный запрос. Проверьте отправленные данные и повторите попытку.';
        return res.status(statusCode).type('html').send(
            '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
            '<title>Ошибка запроса — The Attic</title><link rel="stylesheet" href="/css/style.css"><body>' +
            `<main class="container"><section class="error-card error-card-404"><h1 class="error-title">${statusCode}</h1>` +
            `<p class="error-subtitle">${message}</p><a class="btn-primary" href="/">Вернуться в ленту</a></section></main></body></html>`
        );
    }

    res.status(statusCode).render('500', {
        title: '500 — Сбой на чердаке'
    }, (renderError, html) => {
        if (renderError) {
            console.error('Не удалось отобразить шаблон 500:', renderError);
            return res.status(500).type('html').send(
                '<!doctype html><html lang="ru"><meta charset="utf-8"><title>500 — The Attic</title>' +
                '<link rel="stylesheet" href="/css/style.css"><body><main class="container">' +
                '<section class="error-card error-card-500"><span class="error-code">500</span>' +
                '<h1 class="error-title">На чердаке перегорела лампа</h1>' +
                '<p class="error-subtitle">Внутренняя ошибка сервера. Проверьте подключение к базе данных и повторите запрос.</p>' +
                '<a class="btn-primary" href="/">Вернуться в ленту</a></section></main></body></html>'
            );
        }
        res.type('html').send(html);
    });
});

app.listen(PORT, async () => {
    try {
        await sequelize.authenticate();
        console.log('База данных PostgreSQL успешно подключена!');
    } catch (error) {
        console.error('Ошибка подключения к базе данных:', error.message);
    }
    console.log(`Сервер "The Attic" запущен: http://localhost:${PORT}`);
    console.log('Ветка: pz21 (четный вариант — логирование в БД)');
});

module.exports = app;

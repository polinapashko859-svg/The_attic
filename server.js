require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const { sequelize } = require('./models');
const sketchRoutes = require('./routes/sketchRoutes');
const authRoutes = require('./routes/auth');

const requestLogger = require('./middleware/logger');
const authSimulation = require('./middleware/authSim');

const limits = require('./config/limits.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(requestLogger);
app.use(authSimulation);

app.use('/auth', authRoutes);
app.use('/sketches', sketchRoutes);

let items = [
    {
        id: 1,
        title: "Утренний кофе у окна чердака",
        content: "Запах свежемолотых зерен арабики, раскрытый томик стихов и капли дождя на мутном стекле. Кажется, время здесь замедляет свой ход.",
        author: "Lydia",
        paperType: "parchment",
        views: 142,
        warmth: 24,
        imageUrl: "https://i.pinimg.com/736x/6f/8b/a3/6f8ba3fe964c320819af9b0d8aadcb3c.jpg",
        createdAt: "14.10.2026, 09:15",
        comments: [
            { id: 1, author: "Arthur", text: "Очень атмосферно написано, захотелось сварить кофе.", createdAt: "14.10.2026, 10:04" }
        ]
    },
    {
        id: 2,
        title: "Забытая шкатулка с письмами",
        content: "Нашла в углу под дубовой балкой резную шкатулку. Внутри пожелтевшие открытки со штемпелями 1954 года и высохший вереск.",
        author: "Polina",
        paperType: "kraft",
        views: 218,
        warmth: 56,
        imageUrl: "https://i.pinimg.com/736x/b5/94/cf/b594cf49f8e2682ee4524ff6a182e9ec.jpg",
        createdAt: "14.10.2026, 11:40",
        comments: [
            { id: 1, author: "Lydia", text: "Какая находка! Обязательно сохрани эти открытки.", createdAt: "14.10.2026, 12:15" }
        ]
    },
    {
        id: 3,
        title: "Мысли в полночь без чернил",
        content: "Иногда лучшие идеи приходят тогда, когда свеча уже почти догорела, а перо царапает пустой лист. Никаких картинок — только чистая мысль.",
        author: "Arthur",
        paperType: "linen",
        views: 89,
        warmth: 19,
        imageUrl: null, 
        createdAt: "14.10.2026, 23:55",
        comments: []
    },
    {
        id: 4,
        title: "Старый латунный компас",
        content: "Стрелка компаса дрожит, но упорно указывает на север, как и сто лет назад. Интересно, чьи карманы он грел во время морских странствий?",
        author: "Polina",
        paperType: "pressed-flower",
        views: 175,
        warmth: 43,
        imageUrl: "https://i.pinimg.com/1200x/7a/9b/8c/7a9b8cfd4dee0f77e91313a9df778c7a.jpg",
        createdAt: "14.10.2026, 14:02",
        comments: [
            { id: 1, author: "VintageMuse", text: "Вещи с историей обладают особой душой.", createdAt: "14.10.2026, 15:30" }
        ]
    }
];

app.get('/', (req, res) => {
    res.render('index', {
        title: 'Главная — The Attic',
        items: items
    });
});

app.get('/add', (req, res) => {
    res.render('add', {
        title: 'Добавить набросок — The Attic',
        error: null,
        formData: {}
    });
});

app.post('/add', (req, res) => {
    let { title, author, paperType, views, content, imageUrl } = req.body;

    title = (title || '').trim();
    author = (author || '').trim();
    content = (content || '').trim();
    imageUrl = (imageUrl || '').trim() || null;
    const viewsNum = Number(views);

    if (title.length < limits.title.minLength || title.length > limits.title.maxLength) {
        return res.status(400).render('add', {
            title: 'Ошибка валидации',
            error: limits.title.errorMessage,
            formData: req.body
        });
    }

    if (author.length < limits.author.minLength || author.length > limits.author.maxLength) {
        return res.status(400).render('add', {
            title: 'Ошибка валидации',
            error: limits.author.errorMessage,
            formData: req.body
        });
    }

    if (isNaN(viewsNum) || viewsNum < limits.views.min) {
        return res.status(400).render('add', {
            title: 'Ошибка валидации',
            error: limits.views.errorMessage,
            formData: req.body
        });
    }

    if (content.length < limits.content.minLength || content.length > limits.content.maxLength) {
        return res.status(400).render('add', {
            title: 'Ошибка валидации',
            error: limits.content.errorMessage,
            formData: req.body
        });
    }

    const newItem = {
        id: items.length > 0 ? items[items.length - 1].id + 1 : 1,
        title,
        author,
        paperType: paperType || 'parchment',
        views: viewsNum,
        warmth: 1, 
        imageUrl: imageUrl,
        content,
        comments: [], 
        createdAt: new Date().toLocaleString('ru-RU')
    };

    items.push(newItem);
    res.redirect('/');
});

app.get('/item/:id', (req, res, next) => {
    const itemId = parseInt(req.params.id, 10);
    const item = items.find(i => i.id === itemId);

    if (!item) {
        return next(); 
    }

    res.render('item', {
        title: `${item.title} — The Attic`,
        item: item
    });
});

app.post('/item/:id/comment', (req, res) => {
    const itemId = parseInt(req.params.id, 10);
    const item = items.find(i => i.id === itemId);

    if (item) {
        if (!item.comments) item.comments = [];
        
        const author = (req.body.commentAuthor || 'Аноним').trim();
        const text = (req.body.commentText || '').trim();

        if (text.length > 0) {
            item.comments.push({
                id: item.comments.length + 1,
                author: author,
                text: text,
                createdAt: new Date().toLocaleString('ru-RU')
            });
        }
    }

    res.redirect(`/item/${itemId}#comments`);
});

app.get('/messages', (req, res) => {
    const activeUser = req.query.user || 'Lydia';
    res.render('messages', {
        title: 'Сообщения — The Attic',
        activeUser: activeUser
    });
});

app.post('/messages/send', (req, res) => {
    const toUser = req.body.toUser || 'Lydia';
    res.redirect(`/messages?user=${encodeURIComponent(toUser)}`);
});

app.get('/trigger-error', (req, res, next) => {
    const demoError = new Error("Тестовый сбой: на чердаке перегорела лампа накаливания!");
    next(demoError); // Напрямую передаем ошибку в 500 middleware
});

app.use((req, res, next) => {
    res.status(404).render('404', {
        title: '404 — Набросок не найден'
    });
});

app.use((err, req, res, next) => {
    console.error(`💥 [ERROR 500]: ${err.message}`);
    console.error(err.stack);

    res.status(500).render('500', {
        title: '500 — Сбой на чердаке',
        error: err
    });
});

app.listen(PORT, async () => {
    try {
        await sequelize.authenticate();
        console.log(`=========================================`);
        console.log(`База данных PostgreSQL успешно подключена!`);
        console.log(`Сервер "The Attic" запущен: http://localhost:${PORT}`);
        console.log(`Ветка: pz21 (Вариант 19)`);
        console.log(`=========================================`);
    } catch (error) {
        console.error('Ошибка подключения к базе данных:', error.message);
    }
});
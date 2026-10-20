require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const { sequelize } = require('./models');
const sketchRoutes = require('./routes/sketchRoutes');
const authRoutes = require('./routes/auth');

app.use(cors()); 
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/sketches', sketchRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Что-то пошло не так на чердаке... Ошибка сервера." });
});

app.listen(PORT, async () => {
    try {
        await sequelize.authenticate();
        console.log(`=========================================`);
        console.log(`База данных PostgreSQL успешно подключена!`);
        console.log(`Сервер "The Attic" запущен: http://localhost:${PORT}`);
        console.log(`=========================================`);
    } catch (error) {
        console.error('Ошибка подключения к базе данных:', error.message);
    }
});
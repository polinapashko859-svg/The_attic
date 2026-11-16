require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const { sequelize } = require('./models');
const sketchRoutes = require('./routes/sketchRoutes');
const authRoutes = require('./routes/auth');
const mongoRoutes = require('./routes/mongoRoutes');
const registerSketchDiscussion = require('./sockets/sketchDiscussion');

const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || '*' }
});
registerSketchDiscussion(io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors()); 
app.use(express.json());

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB is not connected');
        }
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(503).json({ status: 'unhealthy' });
    }
});

app.use('/auth', authRoutes);
app.use('/sketches', sketchRoutes);
app.use('/api/mongo/sketches', mongoRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Что-то пошло не так на чердаке... Ошибка сервера." });
});

server.listen(PORT, async () => {
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
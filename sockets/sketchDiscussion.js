const jwt = require('jsonwebtoken');
const { Sketch, User } = require('../models');
const SketchMessage = require('../models_mongo/SketchMessage');
const DirectMessage = require('../models_mongo/DirectMessage');

const HISTORY_LIMIT = 100;
const MAX_MESSAGE_LENGTH = 2000;

const roomName = (sketchId) => `sketch:${sketchId}`;
const directRoomName = (firstUserId, secondUserId) => {
    const [lowerId, higherId] = [firstUserId, secondUserId].sort((a, b) => a - b);
    return `direct:${lowerId}:${higherId}`;
};

function emitPresence(io, sketchId) {
    const room = roomName(sketchId);
    const online = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('sketch:presence', { online });
}

function leaveSketchRoom(socket, io) {
    const sketchId = socket.data.sketchId;
    if (!sketchId) return;

    const room = roomName(sketchId);
    socket.leave(room);
    socket.data.sketchId = null;
    io.to(room).emit('sketch:user-left', { name: socket.data.displayName });
    emitPresence(io, sketchId);
}

function registerSketchDiscussion(io) {
    io.use(async (socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) {
            socket.data.user = null;
            socket.data.displayName = 'Гость';
            return next();
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            const message = error.name === 'TokenExpiredError'
                ? 'Сессия входа истекла. Войдите снова.'
                : 'Недействительный токен. Войдите снова.';
            return next(new Error(message));
        }
        if (!decoded || typeof decoded !== 'object' || !decoded.id) {
            return next(new Error('Недействительный или просроченный токен.'));
        }

        try {
            const user = await User.findByPk(decoded.id, {
                attributes: ['id', 'email', 'name']
            });

            if (!user) {
                return next(new Error('Пользователь не найден.'));
            }

            socket.data.user = { id: user.id };
            socket.data.displayName = user.name || user.email;
            next();
        } catch (error) {
            console.error('Ошибка проверки пользователя Socket.IO:', error);
            next(new Error('Не удалось проверить пользователя.'));
        }
    });

    io.on('connection', (socket) => {
        socket.data.sketchId = null;
        socket.data.directRoom = null;

        socket.on('sketch:join', async (payload) => {
            const sketchId = Number(payload && payload.sketchId);
            if (!Number.isSafeInteger(sketchId) || sketchId < 1) {
                socket.emit('sketch:error', { message: 'Некорректный ID наброска.' });
                return;
            }

            try {
                const sketch = await Sketch.findByPk(sketchId, { attributes: ['id'] });
                if (!sketch) {
                    socket.emit('sketch:error', { message: 'Набросок не найден.' });
                    return;
                }

                if (socket.data.sketchId === sketchId) return;
                leaveSketchRoom(socket, io);

                await socket.join(roomName(sketchId));
                socket.data.sketchId = sketchId;

                const history = await SketchMessage.find({ sketchId })
                    .sort({ createdAt: -1 })
                    .limit(HISTORY_LIMIT)
                    .lean();

                socket.emit('sketch:history', {
                    sketchId,
                    messages: history.reverse()
                });
                socket.to(roomName(sketchId)).emit('sketch:user-joined', {
                    name: socket.data.displayName
                });
                emitPresence(io, sketchId);
            } catch (error) {
                console.error('Ошибка подключения к обсуждению:', error);
                if (socket.data.sketchId === sketchId) {
                    socket.leave(roomName(sketchId));
                    socket.data.sketchId = null;
                    emitPresence(io, sketchId);
                }
                socket.emit('sketch:error', { message: 'Не удалось загрузить обсуждение.' });
            }
        });

        socket.on('sketch:message', async (payload, acknowledge) => {
            const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
            const content = typeof (payload && payload.content) === 'string'
                ? payload.content.trim()
                : '';

            if (!socket.data.sketchId) {
                reply({ error: 'Сначала подключитесь к обсуждению наброска.' });
                return;
            }
            if (!socket.data.user) {
                reply({ error: 'Для отправки сообщения необходимо войти.' });
                return;
            }
            if (!content || content.length > MAX_MESSAGE_LENGTH) {
                reply({ error: `Сообщение должно содержать от 1 до ${MAX_MESSAGE_LENGTH} символов.` });
                return;
            }

            try {
                const message = await SketchMessage.create({
                    sketchId: socket.data.sketchId,
                    userId: socket.data.user.id,
                    author: socket.data.displayName,
                    content
                });
                const savedMessage = message.toObject();

                io.to(roomName(socket.data.sketchId)).emit('sketch:message', savedMessage);
                reply({ message: savedMessage });
            } catch (error) {
                console.error('Ошибка сохранения сообщения:', error);
                reply({ error: 'Не удалось сохранить сообщение.' });
            }
        });

        socket.on('direct:join', async (payload) => {
            const recipientId = Number(payload && payload.recipientId);
            const senderId = socket.data.user && socket.data.user.id;

            if (!senderId || !Number.isSafeInteger(recipientId) || recipientId < 1 || recipientId === senderId) {
                socket.emit('direct:error', { message: 'Выберите корректного собеседника.' });
                return;
            }

            try {
                const recipient = await User.findByPk(recipientId, { attributes: ['id'] });
                if (!recipient) {
                    socket.emit('direct:error', { message: 'Собеседник не найден.' });
                    return;
                }

                const room = directRoomName(senderId, recipientId);
                if (socket.data.directRoom !== room) {
                    if (socket.data.directRoom) socket.leave(socket.data.directRoom);
                    await socket.join(room);
                    socket.data.directRoom = room;
                }

                const history = await DirectMessage.find({ conversationId: room })
                    .sort({ createdAt: -1 })
                    .limit(HISTORY_LIMIT)
                    .lean();

                socket.emit('direct:history', {
                    recipientId,
                    messages: history.reverse()
                });
            } catch (error) {
                console.error('Ошибка загрузки личной переписки:', error);
                socket.emit('direct:error', { message: 'Не удалось загрузить переписку.' });
            }
        });

        socket.on('direct:message', async (payload, acknowledge) => {
            const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
            const senderId = socket.data.user && socket.data.user.id;
            const recipientId = Number(payload && payload.recipientId);
            const content = typeof (payload && payload.content) === 'string'
                ? payload.content.trim()
                : '';

            if (!senderId || !Number.isSafeInteger(recipientId) || recipientId < 1 || recipientId === senderId) {
                reply({ error: 'Выберите корректного собеседника.' });
                return;
            }
            const room = directRoomName(senderId, recipientId);
            if (socket.data.directRoom !== room) {
                reply({ error: 'Сначала откройте переписку с этим пользователем.' });
                return;
            }
            if (!content || content.length > MAX_MESSAGE_LENGTH) {
                reply({ error: `Сообщение должно содержать от 1 до ${MAX_MESSAGE_LENGTH} символов.` });
                return;
            }

            try {
                const recipient = await User.findByPk(recipientId, { attributes: ['id'] });
                if (!recipient) {
                    reply({ error: 'Собеседник не найден.' });
                    return;
                }

                const message = await DirectMessage.create({
                    conversationId: room,
                    senderId,
                    recipientId,
                    author: socket.data.displayName,
                    content
                });
                const savedMessage = message.toObject();

                io.to(room).emit('direct:message', savedMessage);
                reply({ message: savedMessage });
            } catch (error) {
                console.error('Ошибка отправки личного сообщения:', error);
                reply({ error: 'Не удалось отправить сообщение.' });
            }
        });

        socket.on('disconnect', () => {
            leaveSketchRoom(socket, io);
        });
    });
}

module.exports = registerSketchDiscussion;

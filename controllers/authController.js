const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Sketch, User, HiddenContact } = require('../models');
const { Op, col, fn, where } = require('sequelize');

const normalizeEmail = (email) => (
    typeof email === 'string' ? email.trim().toLowerCase() : ''
);
const emailMatches = (email) => where(fn('LOWER', col('email')), email);

exports.register = async (req, res, next) => {
    try {
        const { email, password, name, role } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !password) {
            return res.status(400).json({ error: "Пожалуйста, укажите email и пароль." });
        }

        const existingUser = await User.findOne({ where: emailMatches(normalizedEmail) });
        if (existingUser) {
            return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            email: normalizedEmail,
            passwordHash,
            name: name || "Аноним",
            role: role || 'user'
        });

        res.status(201).json({
            message: "Пользователь успешно зарегистрирован!",
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                bio: newUser.bio,
                avatarUrl: newUser.avatarUrl,
                role: newUser.role
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !password) {
            return res.status(400).json({ error: "Укажите email и пароль для входа." });
        }

        const user = await User.findOne({ where: emailMatches(normalizedEmail) });
        if (!user) {
            return res.status(401).json({ error: "Неверный email или пароль." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Неверный email или пароль." });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: "Вход выполнен успешно!",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                bio: user.bio,
                avatarUrl: user.avatarUrl,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['passwordHash'] }
        });

        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден." });
        }

        const sketches = await Sketch.findAll({
            where: { userId: user.id },
            order: [['id', 'DESC']]
        });

        res.json({ ...user.toJSON(), sketches });
    } catch (err) {
        next(err);
    }
};

exports.getPublicProfile = async (req, res, next) => {
    try {
        if (!/^[1-9]\d*$/.test(req.params.id)) {
            return res.status(400).json({ error: 'Некорректный ID пользователя.' });
        }

        const user = await User.findByPk(req.params.id, {
            attributes: ['id', 'name', 'bio', 'avatarUrl', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        const sketches = await Sketch.findAll({
            where: { userId: user.id },
            order: [['id', 'DESC']]
        });

        res.json({ user, sketches });
    } catch (err) {
        next(err);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const body = req.body || {};
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const email = normalizeEmail(body.email);
        const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
        const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';

        if (name.length < 2 || name.length > 50) {
            return res.status(400).json({ error: 'Имя должно содержать от 2 до 50 символов.' });
        }
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Введите корректный email.' });
        }
        if (bio.length > 500) {
            return res.status(400).json({ error: 'Описание профиля не должно превышать 500 символов.' });
        }
        if (
            avatarUrl.length > 2048
            || (avatarUrl && !/^https?:\/\/\S+$/i.test(avatarUrl) && !/^\/avatars\/[a-z0-9_-]+\.(svg|png|jpe?g|webp)$/i.test(avatarUrl))
        ) {
            return res.status(400).json({ error: 'Укажите ссылку на изображение HTTP(S) или выберите готовый аватар.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        const duplicateEmail = await User.findOne({
            where: {
                [Op.and]: [
                    emailMatches(email),
                    { id: { [Op.ne]: user.id } }
                ]
            }
        });
        if (duplicateEmail) {
            return res.status(409).json({ error: 'Этот email уже используется.' });
        }

        await user.update({ name, email, bio, avatarUrl: avatarUrl || null });
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            role: user.role
        });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Этот email уже используется.' });
        }
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден." });
        }

        await user.destroy();
        res.json({ message: `Пользователь с ID ${req.params.id} успешно удален.` });
    } catch (err) {
        next(err);
    }
};

exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['passwordHash'] },
            order: [['id', 'ASC']]
        });
        res.json(users);
    } catch (err) {
        next(err);
    }
};

exports.getContacts = async (req, res, next) => {
    try {
        const hiddenContacts = await HiddenContact.findAll({
            where: { userId: req.user.id },
            attributes: ['contactId'],
            raw: true
        });
        const excludedIds = [
            req.user.id,
            ...hiddenContacts.map(({ contactId }) => contactId)
        ];
        const contacts = await User.findAll({
            where: { id: { [Op.notIn]: excludedIds } },
            attributes: ['id', 'name', 'avatarUrl'],
            order: [['id', 'ASC']]
        });

        res.json(contacts.map((contact) => ({
            id: contact.id,
            name: contact.name || `Пользователь ${contact.id}`,
            avatarUrl: contact.avatarUrl
        })));
    } catch (err) {
        next(err);
    }
};

exports.removeContact = async (req, res, next) => {
    try {
        if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
            return res.status(400).json({ error: 'Некорректный ID собеседника.' });
        }

        const contactId = Number(req.params.id);
        if (contactId === Number(req.user.id)) {
            return res.status(400).json({ error: 'Нельзя удалить себя из списка собеседников.' });
        }

        const contact = await User.findByPk(contactId, { attributes: ['id'] });
        if (!contact) {
            return res.status(404).json({ error: 'Собеседник не найден.' });
        }

        await HiddenContact.findOrCreate({
            where: { userId: req.user.id, contactId }
        });

        res.json({ message: 'Собеседник удалён из вашего списка.' });
    } catch (err) {
        next(err);
    }
};

exports.restoreContact = async (req, res, next) => {
    try {
        if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
            return res.status(400).json({ error: 'Некорректный ID собеседника.' });
        }

        const contactId = Number(req.params.id);
        if (contactId === Number(req.user.id)) {
            return res.status(400).json({ error: 'Нельзя начать переписку с собой.' });
        }

        const contact = await User.findByPk(contactId, { attributes: ['id'] });
        if (!contact) {
            return res.status(404).json({ error: 'Собеседник не найден.' });
        }

        await HiddenContact.destroy({
            where: { userId: req.user.id, contactId }
        });

        res.json({ message: 'Собеседник добавлен в список.' });
    } catch (err) {
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден." });
        }

        await user.destroy();
        res.json({ message: `Пользователь с ID ${req.params.id} успешно удален администратором.` });
    } catch (err) {
        next(err);
    }
};
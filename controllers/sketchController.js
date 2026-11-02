const { Sketch, User } = require('../models');
const { Op } = require('sequelize');

exports.getAllSketches = async (req, res, next) => {
    try {
        const { search } = req.query;
        let whereCondition = {};

        if (search) {
            whereCondition = {
                [Op.or]: [
                    { title: { [Op.iLike]: `%${search}%` } },
                    { content: { [Op.iLike]: `%${search}%` } },
                    { author: { [Op.iLike]: `%${search}%` } }
                ]
            };
        }

        const sketches = await Sketch.findAll({
            where: whereCondition,
            include: [{ model: User, as: 'user', attributes: ['email'] }],
            order: [['id', 'DESC']]
        });
        res.json(sketches);
    } catch (err) {
        next(err);
    }
};

exports.getSketchById = async (req, res, next) => {
    try {
        const sketch = await Sketch.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['email'] }]
        });
        if (!sketch) {
            return res.status(404).json({ error: "Набросок не найден в архивах чердака." });
        }
        res.json(sketch);
    } catch (err) {
        next(err);
    }
};

exports.createSketch = async (req, res, next) => {
    try {
        const { title, content, paperType, readingTime, imageUrl } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: "Пожалуйста, укажите заголовок и содержание наброска." });
        }

        const user = await User.findByPk(req.user.id);

        const newSketch = await Sketch.create({
            title,
            content,
            author: user.name || "Аноним",
            paperType: paperType || "parchment",
            readingTime: readingTime || 2,
            imageUrl: imageUrl || null,
            userId: req.user.id
        });

        res.status(201).json(newSketch);
    } catch (err) {
        next(err);
    }
};

exports.updateSketch = async (req, res, next) => {
    try {
        const { title, content, author, paperType, readingTime, imageUrl } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: "Данные для обновления неполные." });
        }

        const sketch = await Sketch.findByPk(req.params.id);
        if (!sketch) {
            return res.status(404).json({ error: "Не удается обновить: набросок не найден." });
        }

        if (sketch.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Вы можете редактировать только свои наброски." });
        }

        await sketch.update({
            title,
            content,
            author: author || sketch.author,
            paperType: paperType || sketch.paperType,
            readingTime: readingTime !== undefined ? readingTime : sketch.readingTime,
            imageUrl: imageUrl !== undefined ? imageUrl : sketch.imageUrl
        });

        res.json(sketch);
    } catch (err) {
        next(err);
    }
};

exports.deleteSketch = async (req, res, next) => {
    try {
        const sketch = await Sketch.findByPk(req.params.id);
        if (!sketch) {
            return res.status(404).json({ error: "Набросок не найден." });
        }

        // Строгая проверка: удалять может только владелец или админ
        if (sketch.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Вы можете удалять только свои наброски." });
        }

        await sketch.destroy();
        res.json({ message: "Удалено." });
    } catch (err) {
        next(err);
    }
};
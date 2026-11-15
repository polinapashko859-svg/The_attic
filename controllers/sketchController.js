const { Sketch, User } = require('../models');
const { Op } = require('sequelize');
const validateSketchInput = require('../utils/validateSketchInput');

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
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatarUrl'] }],
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
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatarUrl'] }]
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
        const validation = validateSketchInput(req.body);
        if (validation.error) {
            return res.status(400).json({ error: validation.error });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(401).json({ error: "Пользователь не найден. Войдите снова." });
        }

        const newSketch = await Sketch.create({
            ...validation.value,
            author: user.name || "Аноним",
            userId: req.user.id
        });

        res.status(201).json({
            ...newSketch.toJSON(),
            user: {
                id: user.id,
                name: user.name,
                avatarUrl: user.avatarUrl
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.updateSketch = async (req, res, next) => {
    try {
        const validation = validateSketchInput(req.body, { partial: true });
        if (validation.error) {
            return res.status(400).json({ error: validation.error });
        }

        const sketch = await Sketch.findByPk(req.params.id);
        if (!sketch) {
            return res.status(404).json({ error: "Не удается обновить: набросок не найден." });
        }

        if (sketch.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Вы можете редактировать только свои наброски." });
        }

        await sketch.update({
            ...validation.value,
            paperType: validation.value.paperType || sketch.paperType,
            imageUrl: validation.value.imageUrl === undefined ? sketch.imageUrl : validation.value.imageUrl
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

        if (sketch.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Вы можете удалять только свои наброски." });
        }

        await sketch.destroy();
        res.json({ message: "Удалено." });
    } catch (err) {
        next(err);
    }
};
const { Sketch } = require('../models');

exports.getAllSketches = async (req, res, next) => {
    try {
        const sketches = await Sketch.findAll({
            order: [['id', 'ASC']]
        });
        res.json(sketches);
    } catch (err) {
        next(err);
    }
};

exports.getSketchById = async (req, res, next) => {
    try {
        const sketch = await Sketch.findByPk(req.params.id);
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
        const { title, content, author, paperType } = req.body;

        // Валидация входных данных (статус 400)
        if (!title || !content) {
            return res.status(400).json({ error: "Пожалуйста, укажите заголовок и содержание наброска." });
        }

        const newSketch = await Sketch.create({
            title,
            content,
            author: author || "Аноним",
            paperType: paperType || "parchment"
        });

        res.status(201).json(newSketch);
    } catch (err) {
        next(err);
    }
};

exports.updateSketch = async (req, res, next) => {
    try {
        const { title, content, author, paperType } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: "Данные для обновления неполные." });
        }

        const sketch = await Sketch.findByPk(req.params.id);
        if (!sketch) {
            return res.status(404).json({ error: "Не удается обновить: набросок не найден." });
        }

        await sketch.update({
            title,
            content,
            author: author || sketch.author,
            paperType: paperType || sketch.paperType
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
            return res.status(404).json({ error: "Не удается удалить: набросок не найден." });
        }

        await sketch.destroy();
        res.json({ message: "Набросок успешно удален из архива чердака.", sketch });
    } catch (err) {
        next(err);
    }
};
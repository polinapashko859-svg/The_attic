const { Sketch } = require('../models');
const limits = require('../config/limits.json');

const calculateReadingTime = (content) => {
    const wordCount = (content.match(/[\p{L}\p{N}]+/gu) || []).length;
    return Math.max(1, Math.ceil(wordCount / limits.readingSpeedWpm));
};

const validateSketch = ({ title, content, author, paperType, imageUrl }) => {
    for (const [value, rule] of [
        [title, limits.title],
        [content, limits.content],
        [author, limits.author]
    ]) {
        if (typeof value !== 'string' || value.trim().length < rule.minLength || value.trim().length > rule.maxLength) {
            return rule.errorMessage;
        }
    }

    if (!limits.paperTypes.includes(paperType)) {
        return limits.paperTypeErrorMessage;
    }

    if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
        if (typeof imageUrl !== 'string' || imageUrl.length > limits.imageUrl.maxLength) {
            return limits.imageUrl.errorMessage;
        }
        try {
            if (!['http:', 'https:'].includes(new URL(imageUrl).protocol)) {
                return limits.imageUrl.errorMessage;
            }
        } catch {
            return limits.imageUrl.errorMessage;
        }
    }

    return null;
};

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
        const imageUrl = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : null;
        const validationError = validateSketch({ title, content, author, paperType, imageUrl });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const newSketch = await Sketch.create({
            title: title.trim(),
            content: content.trim(),
            author: author.trim(),
            paperType,
            imageUrl,
            warmth: 1,
            readingTime: calculateReadingTime(content.trim())
        });

        res.status(201).json(newSketch);
    } catch (err) {
        next(err);
    }
};

exports.updateSketch = async (req, res, next) => {
    try {
        const { title, content, author, paperType } = req.body;
        const imageUrl = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : null;
        const validationError = validateSketch({ title, content, author, paperType, imageUrl });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const sketch = await Sketch.findByPk(req.params.id);
        if (!sketch) {
            return res.status(404).json({ error: "Не удается обновить: набросок не найден." });
        }

        await sketch.update({
            title: title.trim(),
            content: content.trim(),
            author: author.trim(),
            paperType,
            imageUrl,
            readingTime: calculateReadingTime(content.trim())
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
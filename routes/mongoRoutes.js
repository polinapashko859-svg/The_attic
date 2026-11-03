const express = require('express');
const router = express.Router();
const Sketch = require('../models_mongo/Sketch'); // Импортируем нашу модель Mongo

// 1. GET / - Получить все наброски
router.get('/', async (req, res, next) => {
    try {
        // .find() - получает все документы. Сортируем по дате создания (сначала новые)
        const sketches = await Sketch.find().sort({ createdAt: -1 });
        res.json(sketches);
    } catch (err) {
        next(err);
    }
});

// 2. GET /:id - Получить один набросок по ID
router.get('/:id', async (req, res, next) => {
    try {
        const sketch = await Sketch.findById(req.params.id);
        if (!sketch) {
            return res.status(404).json({ error: "Набросок не найден в MongoDB." });
        }
        res.json(sketch);
    } catch (err) {
        next(err);
    }
});

// 3. POST / - Создать новый набросок
router.post('/', async (req, res, next) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: "Заголовок и текст обязательны." });
        }

        // Model.create() - создает и сразу сохраняет документ
        const newSketch = await Sketch.create(req.body);
        res.status(201).json(newSketch);
    } catch (err) {
        next(err);
    }
});

// 4. PUT /:id - Обновить набросок
router.put('/:id', async (req, res, next) => {
    try {
        // { new: true } - возвращает уже обновленный документ, а не старый
        const updatedSketch = await Sketch.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (!updatedSketch) {
            return res.status(404).json({ error: "Набросок не найден." });
        }
        res.json(updatedSketch);
    } catch (err) {
        next(err);
    }
});

// 5. DELETE /:id - Удалить набросок
router.delete('/:id', async (req, res, next) => {
    try {
        const deletedSketch = await Sketch.findByIdAndDelete(req.params.id);
        
        if (!deletedSketch) {
            return res.status(404).json({ error: "Набросок не найден." });
        }
        
        res.json({ message: "Набросок успешно удален из MongoDB.", sketch: deletedSketch });
    } catch (err) {
        next(err);
    }
});

// 6. POST /:id/comments - Добавить комментарий (вложенный массив)
router.post('/:id/comments', async (req, res, next) => {
    try {
        const { author, text } = req.body;
        
        if (!author || !text) {
            return res.status(400).json({ error: "Укажите автора и текст комментария." });
        }

        // 1. Находим набросок по ID
        const sketch = await Sketch.findById(req.params.id);
        
        if (!sketch) {
            return res.status(404).json({ error: "Набросок не найден." });
        }

        // 2. Добавляем новый комментарий в массив comments
        sketch.comments.push({
            author,
            text
        });

        // 3. Сохраняем обновленный документ
        await sketch.save();

        res.status(201).json({
            message: "Комментарий добавлен!",
            comments: sketch.comments
        });
    } catch (err) {
        next(err);
    }
});

// 7. PUT /:id/comments/:commentId - Обновить текст комментария
router.put('/:id/comments/:commentId', async (req, res, next) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: "Укажите новый текст комментария." });
        }

        const sketch = await Sketch.findById(req.params.id);
        if (!sketch) {
            return res.status(404).json({ error: "Набросок не найден." });
        }

        // Ищем комментарий в массиве по его ID (commentId)
        const comment = sketch.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: "Комментарий не найден." });
        }

        // Обновляем текст и сохраняем
        comment.text = text;
        await sketch.save();

        res.json({ message: "Комментарий обновлен!", comments: sketch.comments });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
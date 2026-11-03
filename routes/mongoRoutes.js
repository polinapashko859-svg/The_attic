const express = require('express');
const router = express.Router();
const Sketch = require('../models_mongo/Sketch'); 

router.get('/', async (req, res, next) => {
    try {
        const sketches = await Sketch.find().sort({ createdAt: -1 });
        res.json(sketches);
    } catch (err) {
        next(err);
    }
});

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

router.post('/', async (req, res, next) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: "Заголовок и текст обязательны." });
        }

        
        const newSketch = await Sketch.create(req.body);
        res.status(201).json(newSketch);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
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

router.post('/:id/comments', async (req, res, next) => {
    try {
        const { author, text } = req.body;
        
        if (!author || !text) {
            return res.status(400).json({ error: "Укажите автора и текст комментария." });
        }

        
        const sketch = await Sketch.findById(req.params.id);
        
        if (!sketch) {
            return res.status(404).json({ error: "Набросок не найден." });
        }

        
        sketch.comments.push({
            author,
            text
        });

        
        await sketch.save();

        res.status(201).json({
            message: "Комментарий добавлен!",
            comments: sketch.comments
        });
    } catch (err) {
        next(err);
    }
});

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

        const comment = sketch.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: "Комментарий не найден." });
        }

        comment.text = text;
        await sketch.save();

        res.json({ message: "Комментарий обновлен!", comments: sketch.comments });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
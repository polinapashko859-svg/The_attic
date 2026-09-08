const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

let sketches = [
    { id: 1, title: "Утренний кофе", content: "Запах молотых зерен и старая книга.", author: "Lydia", createdAt: new Date().toLocaleString('ru-RU')  },
    { id: 2, title: "Чердак", content: "Нашла коробку со старыми письмами.", author: "Admin", createdAt: new Date().toLocaleString('ru-RU')}
];


app.get('/sketches', (req, res) => {
    res.json(sketches);
});

app.get('/sketches/:id', (req, res) => {
    const sketch = sketches.find(s => s.id === parseInt(req.params.id));
    
    if (!sketch) {
        return res.status(404).json({ error: "Набросок не найден в архивах чердака." });
    }
    res.json(sketch);
});

app.post('/sketches', (req, res) => {
    const { title, content, author } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: "Пожалуйста, укажите заголовок и содержание наброска." });
    }

    const newSketch = {
        id: sketches.length > 0 ? sketches[sketches.length - 1].id + 1 : 1,
        title,
        content,
        author: author || "Аноним",
        createdAt: new Date().toLocaleString('ru-RU')
    };

    sketches.push(newSketch);
    res.status(201).json(newSketch); 
});

app.put('/sketches/:id', (req, res) => {
    const sketchIndex = sketches.findIndex(s => s.id === parseInt(req.params.id));

    if (sketchIndex === -1) {
        return res.status(404).json({ error: "Не удается обновить: набросок не найден." });
    }

    const { title, content, author } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: "Данные для обновления неполные." });
    }

    sketches[sketchIndex] = {
        ...sketches[sketchIndex],
        title,
        content,
        author: author || sketches[sketchIndex].author
    };

    res.json(sketches[sketchIndex]);
});

app.delete('/sketches/:id', (req, res) => {
    const sketchIndex = sketches.findIndex(s => s.id === parseInt(req.params.id));

    if (sketchIndex === -1) {
        return res.status(404).json({ error: "Не удается удалить: набросок не найден." });
    }

    const deletedSketch = sketches.splice(sketchIndex, 1);
    res.json({ message: "Набросок успешно удален из архива.", sketch: deletedSketch[0] });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Что-то пошло не так на чердаке... Ошибка сервера." });
});

app.listen(PORT, () => {
    console.log(`Сервер работает: http://localhost:${PORT}`);
});
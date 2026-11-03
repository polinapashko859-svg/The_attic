const mongoose = require('mongoose');

// Схема для вложенного документа (комментарии)
const commentSchema = new mongoose.Schema({
  author: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Основная схема наброска
const sketchSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  paperType: { type: String, default: 'parchment' },
  readingTime: { type: Number, default: 2 },
  imageUrl: { type: String, default: null },
  
  // Вложенный массив комментариев!
  comments: [commentSchema],
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sketch', sketchSchema);
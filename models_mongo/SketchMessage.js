const mongoose = require('mongoose');

const sketchMessageSchema = new mongoose.Schema({
  sketchId: { type: Number, required: true },
  userId: { type: Number, required: true },
  author: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

sketchMessageSchema.index({ sketchId: 1, createdAt: -1 });

module.exports = mongoose.model('SketchMessage', sketchMessageSchema);

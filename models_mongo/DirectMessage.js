const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  senderId: { type: Number, required: true },
  recipientId: { type: Number, required: true },
  author: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

directMessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);

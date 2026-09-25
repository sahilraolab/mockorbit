const mongoose = require('mongoose');

// Backup copy of every contact form submission (Web3Forms delivers the email;
// this keeps the data if that service fails or its quota runs out)
const contactMessageSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true, maxlength: 120 },
  email:     { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
  topic:     { type: String, required: true, trim: true, maxlength: 100 },
  message:   { type: String, required: true, trim: true, maxlength: 5000 },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ip:        { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);

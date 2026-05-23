const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, enum: ['site', 'exam', 'series'], default: 'site' },
  refId:   { type: mongoose.Schema.Types.ObjectId, default: null }, // exam._id or series._id
  name:    { type: String, required: true, trim: true },
  role:    { type: String, trim: true },
  text:    { type: String, required: true, trim: true, maxlength: 400 },
  rating:  { type: Number, default: 5, min: 1, max: 5 },
  status:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// one review per user per entity
testimonialSchema.index({ userId: 1, type: 1, refId: 1 }, { unique: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);

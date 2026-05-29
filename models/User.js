const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  otp: {
    code:      String,
    expiresAt: Date
  },

  purchasedTests: [{
    testSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeries' },
    purchasedAt:  { type: Date, default: Date.now }
  }],

  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.hasPurchased = function(testSeriesId) {
  return this.purchasedTests.some(pt => pt.testSeriesId.toString() === testSeriesId.toString());
};

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  purchasedTests: [{
    testSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeries' },
    purchasedAt: { type: Date, default: Date.now }
  }],
  otp: {
    code: String,
    expiresAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.methods.hasPurchased = function(testSeriesId) {
  return this.purchasedTests.some(pt => pt.testSeriesId.toString() === testSeriesId.toString());
};

module.exports = mongoose.model('User', userSchema);

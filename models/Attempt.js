const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOption: { type: Number, default: -1 } // -1 = not attempted
  }],
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  rank: { type: Number, default: null },
  weakAreas: [{ type: String }],
  timeTaken: { type: Number, default: 0 }, // in seconds
  status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress' },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date }
});

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeries', required: true },
  amount: { type: Number, required: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = {
  Attempt: mongoose.model('Attempt', attemptSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Admin: mongoose.model('Admin', adminSchema)
};

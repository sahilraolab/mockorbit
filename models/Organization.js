const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, trim: true },
  orgType: {
    type: String,
    enum: ['school', 'college', 'coaching', 'law_academy', 'university', 'other'],
    default: 'coaching'
  },
  address: { type: String, trim: true },
  website: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  subscription: {
    planKey:       { type: String },
    planName:      { type: String },
    billing:       { type: String, enum: ['monthly', 'yearly'] },
    studentsLimit: { type: Number, default: 0 },
    amount:        { type: Number },
    startDate:     { type: Date },
    endDate:       { type: Date },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['active', 'expired', 'pending'], default: 'pending' }
  },
  createdAt: { type: Date, default: Date.now }
});

organizationSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

organizationSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

// Students enrolled in an organisation
const orgStudentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, trim: true },
  rollNumber: { type: String, trim: true },
  batch: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
orgStudentSchema.index({ orgId: 1, userId: 1 }, { unique: true });

// Test assignments by an organisation
const orgAssignmentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  title: { type: String, required: true, trim: true },
  instructions: { type: String, trim: true },
  assignAll: { type: Boolean, default: true },
  assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  Organization: mongoose.model('Organization', organizationSchema),
  OrgStudent: mongoose.model('OrgStudent', orgStudentSchema),
  OrgAssignment: mongoose.model('OrgAssignment', orgAssignmentSchema)
};

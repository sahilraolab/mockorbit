const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  icon: { type: String, default: '📚' },
  createdAt: { type: Date, default: Date.now }
});

const testSeriesSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  title: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  totalMocks: { type: Number, required: true, min: 1 },
  description: { type: String, trim: true },
  features: [{ type: String }],
  previewQuestions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const testSchema = new mongoose.Schema({
  testSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeries', required: true },
  title: { type: String, required: true, trim: true },
  duration: { type: Number, required: true, min: 1 }, // in minutes
  totalQuestions: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
  explanation: { type: String },
  tag: { type: String, required: true, trim: true },
  marks: { type: Number, default: 1 },
  negativeMark: { type: Number, default: 0 },
  order: { type: Number, default: 0 }
});

module.exports = {
  Exam: mongoose.model('Exam', examSchema),
  TestSeries: mongoose.model('TestSeries', testSeriesSchema),
  Test: mongoose.model('Test', testSchema),
  Question: mongoose.model('Question', questionSchema)
};

const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  icon:        { type: String, default: '📚' },

  // ── New rich metadata fields ──────────────────────────────────────
  category:    {
    type: String,
    enum: ['Judiciary', 'Law Entrance', 'SSC', 'Banking', 'UPSC', 'State PSC', 'Railway', 'Defence', 'Teaching', 'Other'],
    default: 'Other'
  },
  language:    [{ type: String, trim: true }],   // e.g. ['English', 'Hindi']
  conductedBy: { type: String, trim: true },     // e.g. 'Bar Council of India'
  examLevel:   {
    type: String,
    enum: ['National', 'State', 'District', 'University', 'Other'],
    default: 'National'
  },
  eligibility: { type: String, trim: true },     // e.g. 'LLB / Law Graduate'
  frequency:   {
    type: String,
    enum: ['Annual', 'Bi-Annual', 'Quarterly', 'Irregular', 'As Notified'],
    default: 'Annual'
  },
  statesApplicable: [{ type: String, trim: true }],  // geo targeting
  totalVacancies: { type: String, trim: true },       // e.g. '1,200 posts'
  examDuration:   { type: String, trim: true },       // e.g. '2 hours'
  totalMarks:     { type: String, trim: true },       // e.g. '200 marks'
  metaDesc:       { type: String, trim: true },       // SEO meta description override
  isActive:       { type: Boolean, default: true },
  sortOrder:      { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now }
});

const testSeriesSchema = new mongoose.Schema({
  examId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },  // optional — kept for backwards-compat
  category: { type: String, trim: true },                           // direct category (replaces exam.category)
  slug:     { type: String, trim: true, sparse: true },             // URL-friendly identifier
  title: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  totalMocks: { type: Number, required: true, min: 1 },
  description: { type: String, trim: true },
  features: [{ type: String }],
  mockLanguages: [{ type: String, trim: true }],  // languages this mock is available in
  previewQuestions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String
  }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },                          // display order in admin list
  createdAt: { type: Date, default: Date.now }
});

const testSchema = new mongoose.Schema({
  testSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeries', required: true },
  title: { type: String, required: true, trim: true },
  duration: { type: Number, required: true, min: 1 }, // in minutes
  totalQuestions: { type: Number, default: 0 },
  sortOrder: { type: Number, default: 0 },             // display order within a series
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

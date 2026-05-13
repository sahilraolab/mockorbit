const { Admin } = require('../models/Attempt');
const { Exam, TestSeries, Test, Question } = require('../models/Exam');
const { Attempt, Payment } = require('../models/Attempt');
const User = require('../models/User');

// Auth
exports.showLogin = (req, res) => {
  if (req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Admin Login', error: req.flash('error') });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.comparePassword(password))) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/admin/login');
    }
    req.session.adminId = admin._id;
    res.redirect('/admin/dashboard');
  } catch (err) {
    req.flash('error', 'Login failed');
    res.redirect('/admin/login');
  }
};

exports.logout = (req, res) => {
  delete req.session.adminId;
  res.redirect('/admin/login');
};

// Dashboard
exports.dashboard = async (req, res) => {
  const [users, exams, series, attempts] = await Promise.all([
    User.countDocuments(),
    Exam.countDocuments(),
    TestSeries.countDocuments(),
    Attempt.countDocuments({ status: 'submitted' })
  ]);
  res.render('admin/dashboard', { title: 'Admin Dashboard', stats: { users, exams, series, attempts } });
};

// Exams
exports.listExams = async (req, res) => {
  const exams = await Exam.find().lean();
  res.render('admin/exams', { title: 'Manage Exams', exams, error: req.flash('error'), success: req.flash('success') });
};

exports.createExam = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await Exam.create({ name, slug, description, icon: icon || '📚' });
    req.flash('success', 'Exam created');
  } catch (err) {
    req.flash('error', err.code === 11000 ? 'Exam already exists' : 'Failed to create exam');
  }
  res.redirect('/admin/exams');
};

exports.updateExam = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await Exam.findByIdAndUpdate(req.params.id, { name, slug, description, icon });
    req.flash('success', 'Exam updated');
  } catch (err) {
    req.flash('error', 'Failed to update exam');
  }
  res.redirect('/admin/exams');
};

exports.deleteExam = async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    req.flash('success', 'Exam deleted');
  } catch (err) {
    req.flash('error', 'Failed to delete exam');
  }
  res.redirect('/admin/exams');
};

// Test Series
exports.listSeries = async (req, res) => {
  const series = await TestSeries.find().populate('examId').lean();
  const exams = await Exam.find().lean();
  res.render('admin/series', { title: 'Manage Test Series', series, exams, error: req.flash('error'), success: req.flash('success') });
};

exports.showCreateSeries = async (req, res) => {
  const exams = await Exam.find().lean();
  res.render('admin/series-form', { title: 'Create Test Series', series: null, exams, error: req.flash('error') });
};

exports.createSeries = async (req, res) => {
  try {
    const { examId, title, price, totalMocks, description, features } = req.body;
    const featuresArr = features
      ? features.split('\n').map(f => f.trim()).filter(Boolean)
      : ['Latest pattern', 'Detailed solutions', 'Rank analysis'];
    await TestSeries.create({ examId, title, price: parseFloat(price), totalMocks: parseInt(totalMocks), description, features: featuresArr });
    req.flash('success', 'Test series created');
    res.redirect('/admin/series');
  } catch (err) {
    req.flash('error', 'Failed to create series');
    res.redirect('/admin/series/new');
  }
};

exports.showEditSeries = async (req, res) => {
  const series = await TestSeries.findById(req.params.id).lean();
  const exams = await Exam.find().lean();
  res.render('admin/series-form', { title: 'Edit Test Series', series, exams, error: req.flash('error') });
};

exports.updateSeries = async (req, res) => {
  try {
    const { examId, title, price, totalMocks, description, features } = req.body;
    const featuresArr = features
      ? features.split('\n').map(f => f.trim()).filter(Boolean)
      : [];
    await TestSeries.findByIdAndUpdate(req.params.id, { examId, title, price: parseFloat(price), totalMocks: parseInt(totalMocks), description, features: featuresArr });
    req.flash('success', 'Test series updated');
    res.redirect('/admin/series');
  } catch (err) {
    req.flash('error', 'Failed to update series');
    res.redirect('/admin/series');
  }
};

exports.deleteSeries = async (req, res) => {
  try {
    await TestSeries.findByIdAndDelete(req.params.id);
    req.flash('success', 'Test series deleted');
  } catch (err) {
    req.flash('error', 'Failed to delete');
  }
  res.redirect('/admin/series');
};

// Tests
exports.listTests = async (req, res) => {
  const tests = await Test.find().populate('testSeriesId').lean();
  const series = await TestSeries.find().lean();
  res.render('admin/tests', { title: 'Manage Tests', tests, series, error: req.flash('error'), success: req.flash('success') });
};

exports.createTest = async (req, res) => {
  try {
    const { testSeriesId, title, duration } = req.body;
    await Test.create({ testSeriesId, title, duration: parseInt(duration) });
    req.flash('success', 'Test created');
  } catch (err) {
    req.flash('error', 'Failed to create test');
  }
  res.redirect('/admin/tests');
};

exports.deleteTest = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ testId: req.params.id });
    req.flash('success', 'Test deleted');
  } catch (err) {
    req.flash('error', 'Failed to delete');
  }
  res.redirect('/admin/tests');
};

// Questions
exports.listQuestions = async (req, res) => {
  const testId = req.query.testId;
  const tests = await Test.find().lean();
  const questions = testId ? await Question.find({ testId }).lean() : [];
  const selectedTest = testId ? await Test.findById(testId).lean() : null;
  res.render('admin/questions', { title: 'Manage Questions', questions, tests, selectedTest, testId, error: req.flash('error'), success: req.flash('success') });
};

exports.createQuestion = async (req, res) => {
  try {
    const { testId, question, option0, option1, option2, option3, correctAnswer, explanation, tag } = req.body;
    await Question.create({
      testId,
      question,
      options: [option0, option1, option2, option3],
      correctAnswer: parseInt(correctAnswer),
      explanation,
      tag
    });
    // Update test question count
    await Test.findByIdAndUpdate(testId, { $inc: { totalQuestions: 1 } });
    req.flash('success', 'Question added');
  } catch (err) {
    req.flash('error', 'Failed to add question');
  }
  res.redirect(`/admin/questions?testId=${req.body.testId}`);
};

exports.deleteQuestion = async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (q) {
      await Test.findByIdAndUpdate(q.testId, { $inc: { totalQuestions: -1 } });
      await q.deleteOne();
    }
    req.flash('success', 'Question deleted');
  } catch (err) {
    req.flash('error', 'Failed to delete');
  }
  res.redirect(req.get('referer') || '/admin/questions');
};

// Users
exports.listUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.render('admin/users', { title: 'Users', users });
};

// Results
exports.listResults = async (req, res) => {
  const attempts = await Attempt.find({ status: 'submitted' })
    .populate('userId', 'mobile')
    .populate('testId', 'title')
    .sort({ submittedAt: -1 })
    .limit(100)
    .lean();
  res.render('admin/results', { title: 'Test Results', attempts });
};

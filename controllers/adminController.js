const { Admin } = require('../models/Attempt');
const { Exam, TestSeries, Test, Question } = require('../models/Exam');
const { Attempt, Payment } = require('../models/Attempt');
const User = require('../models/User');
const { Organization, OrgStudent } = require('../models/Organization');
const Testimonial = require('../models/Testimonial');

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
  const [users, exams, series, attempts, orgs, revenue] = await Promise.all([
    User.countDocuments(),
    Exam.countDocuments(),
    TestSeries.countDocuments(),
    Attempt.countDocuments({ status: 'submitted' }),
    Organization.countDocuments(),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  const totalRevenue = revenue[0]?.total || 0;
  res.render('admin/dashboard', { title: 'Admin Dashboard', stats: { users, exams, series, attempts, orgs, totalRevenue } });
};

// Exams
exports.listExams = async (req, res) => {
  const exams = await Exam.find().lean();
  res.render('admin/exams', { title: 'Manage Exams', exams, error: req.flash('error'), success: req.flash('success') });
};

exports.createExam = async (req, res) => {
  try {
    const {
      name, description, icon,
      category, conductedBy, examLevel, eligibility, frequency,
      totalVacancies, examDuration, totalMarks, metaDesc, isActive, sortOrder
    } = req.body;

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Multi-value fields sent as comma-separated strings
    const language         = req.body.language         ? req.body.language.split(',').map(s => s.trim()).filter(Boolean) : [];
    const statesApplicable = req.body.statesApplicable ? req.body.statesApplicable.split(',').map(s => s.trim()).filter(Boolean) : [];

    await Exam.create({
      name, slug, description, icon: icon || '📚',
      category, conductedBy, examLevel, eligibility, frequency,
      language, statesApplicable,
      totalVacancies, examDuration, totalMarks, metaDesc,
      isActive: isActive !== 'false',
      sortOrder: parseInt(sortOrder) || 0
    });
    req.flash('success', 'Exam created');
  } catch (err) {
    req.flash('error', err.code === 11000 ? 'Exam already exists' : 'Failed to create exam');
  }
  res.redirect('/admin/exams');
};

exports.updateExam = async (req, res) => {
  try {
    const {
      name, description, icon,
      category, conductedBy, examLevel, eligibility, frequency,
      totalVacancies, examDuration, totalMarks, metaDesc, isActive, sortOrder
    } = req.body;

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const language         = req.body.language         ? req.body.language.split(',').map(s => s.trim()).filter(Boolean) : [];
    const statesApplicable = req.body.statesApplicable ? req.body.statesApplicable.split(',').map(s => s.trim()).filter(Boolean) : [];

    await Exam.findByIdAndUpdate(req.params.id, {
      name, slug, description, icon,
      category, conductedBy, examLevel, eligibility, frequency,
      language, statesApplicable,
      totalVacancies, examDuration, totalMarks, metaDesc,
      isActive: isActive !== 'false',
      sortOrder: parseInt(sortOrder) || 0
    });
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

function parseCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else { cur += line[i]; }
  }
  cols.push(cur.trim());
  return cols;
}

exports.bulkImportQuestions = async (req, res) => {
  const testId = req.body.testId || req.query.testId;
  try {
    if (!req.file) {
      req.flash('error', 'Please upload a CSV file.');
      return res.redirect(`/admin/questions?testId=${testId}`);
    }
    if (!testId) {
      req.flash('error', 'Please select a test first.');
      return res.redirect('/admin/questions');
    }

    const content = req.file.buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = content.split('\n').filter(l => l.trim());
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, ''));

    const qIdx   = header.indexOf('question');
    const aIdx   = header.indexOf('optiona');
    const bIdx   = header.indexOf('optionb');
    const cIdx   = header.indexOf('optionc');
    const dIdx   = header.indexOf('optiond');
    const ansIdx = header.indexOf('correctanswer'); // 0-3 or A-D
    const expIdx = header.indexOf('explanation');
    const tagIdx = header.indexOf('tag');

    if (qIdx === -1 || aIdx === -1 || ansIdx === -1) {
      req.flash('error', 'CSV must have columns: question, optionA, optionB, optionC, optionD, correctAnswer');
      return res.redirect(`/admin/questions?testId=${testId}`);
    }

    const dataRows = lines.slice(1);
    let added = 0, failed = 0;

    for (const line of dataRows) {
      const row = parseCSVLine(line);
      try {
        const rawAns = row[ansIdx]?.trim().toUpperCase();
        const correctAnswer = ['A','B','C','D'].includes(rawAns) ? ['A','B','C','D'].indexOf(rawAns) : parseInt(rawAns);
        if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) { failed++; continue; }

        await Question.create({
          testId,
          question: row[qIdx],
          options: [row[aIdx] || '', row[bIdx] || '', row[cIdx] || '', row[dIdx] || ''],
          correctAnswer,
          explanation: expIdx !== -1 ? row[expIdx] : '',
          tag: tagIdx !== -1 ? (row[tagIdx] || 'General') : 'General',
        });
        added++;
      } catch { failed++; }
    }

    await Test.findByIdAndUpdate(testId, { $inc: { totalQuestions: added } });
    req.flash('success', `Bulk import complete — ${added} added, ${failed} failed.`);
  } catch (err) {
    console.error('Bulk import questions error:', err);
    req.flash('error', 'Bulk import failed. Check your CSV format.');
  }
  res.redirect(`/admin/questions?testId=${testId}`);
};

// Users
exports.listUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.render('admin/users', { title: 'Users', users, error: req.flash('error'), success: req.flash('success') });
};

// Login as user (impersonation)
exports.loginAsUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) { req.flash('error', 'User not found'); return res.redirect('/admin/users'); }
    req.session.adminImpersonating = req.session.adminId;
    req.session.userId = user._id.toString();
    res.redirect('/dashboard');
  } catch (e) { req.flash('error', 'Failed'); res.redirect('/admin/users'); }
};

// Organizations
exports.listOrgs = async (req, res) => {
  const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
  const studentCounts = await OrgStudent.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$orgId', count: { $sum: 1 } } }
  ]);
  const countMap = {};
  studentCounts.forEach(s => { countMap[s._id.toString()] = s.count; });
  const orgsWithCounts = orgs.map(o => ({ ...o, studentCount: countMap[o._id.toString()] || 0 }));
  res.render('admin/organizations', { title: 'Organizations', orgs: orgsWithCounts, error: req.flash('error'), success: req.flash('success') });
};

// Login as org (impersonation)
exports.loginAsOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).lean();
    if (!org) { req.flash('error', 'Organization not found'); return res.redirect('/admin/organizations'); }
    req.session.adminImpersonating = req.session.adminId;
    req.session.orgId = org._id.toString();
    res.redirect('/org/dashboard');
  } catch (e) { req.flash('error', 'Failed'); res.redirect('/admin/organizations'); }
};

// Stop impersonation — return to admin
exports.stopImpersonation = (req, res) => {
  if (req.session.adminImpersonating) {
    req.session.adminId = req.session.adminImpersonating;
    delete req.session.adminImpersonating;
  }
  delete req.session.userId;
  delete req.session.orgId;
  res.redirect('/admin/dashboard');
};

// Payments / Invoices
exports.listPayments = async (req, res) => {
  const payments = await Payment.find()
    .populate('userId', 'email name')
    .populate('testSeriesId', 'title price')
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  const totalRevenue = payments.filter(p => p.status === 'success').reduce((s, p) => s + (p.amount || 0), 0);
  res.render('admin/payments', { title: 'Payments & Invoices', payments, totalRevenue });
};

// Testimonials
exports.listTestimonials = async (req, res) => {
  const filter = req.query.status || 'pending';
  const testimonials = await Testimonial.find(filter === 'all' ? {} : { status: filter })
    .sort({ createdAt: -1 }).lean();
  const counts = await Testimonial.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  const cnt = {};
  counts.forEach(c => { cnt[c._id] = c.n; });
  res.render('admin/testimonials', { title: 'Testimonials', testimonials, filter, counts: cnt, error: req.flash('error'), success: req.flash('success') });
};

exports.approveTestimonial = async (req, res) => {
  await Testimonial.findByIdAndUpdate(req.params.id, { status: 'approved' });
  req.flash('success', 'Testimonial approved.');
  res.redirect('/admin/testimonials');
};

exports.rejectTestimonial = async (req, res) => {
  await Testimonial.findByIdAndUpdate(req.params.id, { status: 'rejected' });
  req.flash('success', 'Testimonial rejected.');
  res.redirect('/admin/testimonials');
};

// Results
exports.listResults = async (req, res) => {
  const attempts = await Attempt.find({ status: 'submitted' })
    .populate('userId', 'email')
    .populate('testId', 'title')
    .sort({ submittedAt: -1 })
    .limit(100)
    .lean();
  res.render('admin/results', { title: 'Test Results', attempts });
};

const { Admin } = require('../models/Attempt');
const { Exam, TestSeries, Test, Question } = require('../models/Exam');
const { Attempt, Payment } = require('../models/Attempt');
const User = require('../models/User');
const { Organization, OrgStudent } = require('../models/Organization');
const Testimonial = require('../models/Testimonial');
const SiteSettings = require('../models/SiteSettings');

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
  const [users, series, tests, questions, attempts, orgs, revenue] = await Promise.all([
    User.countDocuments(),
    TestSeries.countDocuments(),
    Test.countDocuments(),
    Question.countDocuments(),
    Attempt.countDocuments({ status: 'submitted' }),
    Organization.countDocuments(),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  const totalRevenue = revenue[0]?.total || 0;
  res.render('admin/dashboard', { title: 'Admin Dashboard', stats: { users, series, tests, questions, attempts, orgs, totalRevenue } });
};

// Exams (kept for backwards-compat API; admin nav no longer links here)
exports.listExams = async (req, res) => {
  const exams = await Exam.find().lean();
  res.render('admin/exams', { title: 'Manage Exams', exams, error: req.flash('error'), success: req.flash('success') });
};

exports.createExam = async (req, res) => {
  try {
    const { name, description, icon, category, conductedBy, examLevel, eligibility, frequency, totalVacancies, examDuration, totalMarks, metaDesc, isActive, sortOrder } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const language         = req.body.language         ? req.body.language.split(',').map(s => s.trim()).filter(Boolean) : [];
    const statesApplicable = req.body.statesApplicable ? req.body.statesApplicable.split(',').map(s => s.trim()).filter(Boolean) : [];
    await Exam.create({ name, slug, description, icon: icon || '📚', category: category || undefined, conductedBy, examLevel: examLevel || undefined, eligibility, frequency: frequency || undefined, language, statesApplicable, totalVacancies, examDuration, totalMarks, metaDesc, isActive: isActive !== 'false', sortOrder: parseInt(sortOrder) || 0 });
    req.flash('success', 'Exam created');
  } catch (err) {
    req.flash('error', err.code === 11000 ? 'Exam already exists' : 'Failed to create exam');
  }
  res.redirect('/admin/exams');
};

exports.updateExam = async (req, res) => {
  try {
    const { name, description, icon, category, conductedBy, examLevel, eligibility, frequency, totalVacancies, examDuration, totalMarks, metaDesc, isActive, sortOrder } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const language         = req.body.language         ? req.body.language.split(',').map(s => s.trim()).filter(Boolean) : [];
    const statesApplicable = req.body.statesApplicable ? req.body.statesApplicable.split(',').map(s => s.trim()).filter(Boolean) : [];
    await Exam.findByIdAndUpdate(req.params.id, { name, slug, description, icon, category: category || undefined, conductedBy, examLevel: examLevel || undefined, eligibility, frequency: frequency || undefined, language, statesApplicable, totalVacancies, examDuration, totalMarks, metaDesc, isActive: isActive !== 'false', sortOrder: parseInt(sortOrder) || 0 });
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

// ─── Test Series ─────────────────────────────────────────────────────────────

exports.listSeries = async (req, res) => {
  const series = await TestSeries.find().populate('examId').sort({ sortOrder: 1, createdAt: 1 }).lean();
  res.render('admin/series', { title: 'Manage Test Series', series, error: req.flash('error'), success: req.flash('success') });
};

exports.showCreateSeries = async (req, res) => {
  res.render('admin/series-form', { title: 'Create Test Series', series: null, error: req.flash('error') });
};

exports.createSeries = async (req, res) => {
  try {
    const { title, price, totalMocks, description, features, category } = req.body;
    const featuresArr = features
      ? features.split('\n').map(f => f.trim()).filter(Boolean)
      : [];
    const mockLanguages = req.body.mockLanguages
      ? req.body.mockLanguages.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    await TestSeries.create({
      title: title.trim(),
      price: parseFloat(price) || 0,
      totalMocks: parseInt(totalMocks) || 1,
      description: description?.trim() || undefined,
      features: featuresArr,
      mockLanguages,
      category: category?.trim() || undefined
    });
    req.flash('success', 'Test series created');
    res.redirect('/admin/series');
  } catch (err) {
    console.error('createSeries error:', err);
    req.flash('error', err.message || 'Failed to create series');
    res.redirect('/admin/series/new');
  }
};

exports.showEditSeries = async (req, res) => {
  const series = await TestSeries.findById(req.params.id).lean();
  if (!series) { req.flash('error', 'Series not found'); return res.redirect('/admin/series'); }
  res.render('admin/series-form', { title: 'Edit Test Series', series, error: req.flash('error') });
};

exports.updateSeries = async (req, res) => {
  try {
    const { title, price, totalMocks, description, features, category } = req.body;
    const featuresArr = features
      ? features.split('\n').map(f => f.trim()).filter(Boolean)
      : [];
    const mockLanguages = req.body.mockLanguages
      ? req.body.mockLanguages.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    await TestSeries.findByIdAndUpdate(req.params.id, {
      title: title.trim(),
      price: parseFloat(price) || 0,
      totalMocks: parseInt(totalMocks) || 1,
      description: description?.trim() || undefined,
      features: featuresArr,
      mockLanguages,
      category: category?.trim() || undefined
    });
    req.flash('success', 'Test series updated');
    res.redirect('/admin/series');
  } catch (err) {
    console.error('updateSeries error:', err);
    req.flash('error', err.message || 'Failed to update series');
    res.redirect('/admin/series');
  }
};

exports.toggleSeriesActive = async (req, res) => {
  try {
    const series = await TestSeries.findById(req.params.id);
    if (!series) throw new Error('Not found');
    series.isActive = !series.isActive;
    await series.save();
    req.flash('success', series.isActive ? 'Series is now visible on the site' : 'Series hidden from the site');
  } catch (err) {
    req.flash('error', 'Failed to update visibility');
  }
  res.redirect('/admin/series');
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

/**
 * Reorder series via drag-and-drop.
 * body.orderedIds = JSON array of series IDs in the new order.
 */
exports.reorderSeries = async (req, res) => {
  try {
    const ids = JSON.parse(req.body.orderedIds || '[]');
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: false, message: 'No order data' });
    }
    const bulkOps = ids.map((id, i) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i * 10 } } }
    }));
    await TestSeries.bulkWrite(bulkOps);
    res.json({ success: true });
  } catch (err) {
    console.error('reorderSeries error:', err);
    res.json({ success: false, message: err.message });
  }
};

// ─── Tests ───────────────────────────────────────────────────────────────────

exports.listTests = async (req, res) => {
  const seriesFilter = req.query.seriesId ? { testSeriesId: req.query.seriesId } : {};
  const tests  = await Test.find(seriesFilter).populate('testSeriesId').sort({ sortOrder: 1, createdAt: 1 }).lean();
  const series = await TestSeries.find().sort({ createdAt: -1 }).lean();
  res.render('admin/tests', { title: 'Manage Tests', tests, series, selectedSeriesId: req.query.seriesId || '', error: req.flash('error'), success: req.flash('success') });
};

exports.createTest = async (req, res) => {
  try {
    const { testSeriesId, title, duration } = req.body;
    // Auto-assign next sort order within the series
    const lastTest = await Test.findOne({ testSeriesId }).sort({ sortOrder: -1 });
    const sortOrder = lastTest ? lastTest.sortOrder + 10 : 0;
    await Test.create({ testSeriesId, title: title.trim(), duration: parseInt(duration), sortOrder });
    req.flash('success', 'Test created');
  } catch (err) {
    req.flash('error', 'Failed to create test');
  }
  res.redirect('/admin/tests' + (req.body.testSeriesId ? '?seriesId=' + req.body.testSeriesId : ''));
};

exports.updateTest = async (req, res) => {
  try {
    const { title, duration } = req.body;
    await Test.findByIdAndUpdate(req.params.id, {
      title: title.trim(),
      duration: parseInt(duration)
      // sortOrder intentionally NOT updated here — drag-and-drop handles ordering
    });
    req.flash('success', 'Test updated');
  } catch (err) {
    req.flash('error', 'Failed to update test');
  }
  res.redirect(req.get('referer') || '/admin/tests');
};

/**
 * Move a test up or down within its series by swapping sort orders.
 * body.direction = 'up' | 'down'
 */
exports.moveTest = async (req, res) => {
  try {
    const { direction } = req.body;
    const test = await Test.findById(req.params.id).lean();
    if (!test) throw new Error('Test not found');

    // Get all sibling tests sorted by current order
    const siblings = await Test.find({ testSeriesId: test.testSeriesId })
      .sort({ sortOrder: 1, createdAt: 1 }).lean();

    const idx     = siblings.findIndex(t => t._id.toString() === req.params.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (swapIdx >= 0 && swapIdx < siblings.length) {
      // Normalise all sort orders to 0, 10, 20 … then swap the two
      const bulkOps = siblings.map((t, i) => ({
        updateOne: { filter: { _id: t._id }, update: { $set: { sortOrder: i * 10 } } }
      }));
      await Test.bulkWrite(bulkOps);

      // Swap the two positions
      await Test.findByIdAndUpdate(siblings[idx]._id,     { sortOrder: swapIdx * 10 });
      await Test.findByIdAndUpdate(siblings[swapIdx]._id, { sortOrder: idx * 10 });
      req.flash('success', 'Test reordered');
    }
  } catch (err) {
    req.flash('error', 'Failed to reorder test');
  }
  res.redirect(req.get('referer') || '/admin/tests');
};

/**
 * Reorder tests via drag-and-drop.
 * body.orderedIds = JSON array of test IDs in the new order.
 */
exports.reorderTests = async (req, res) => {
  try {
    const ids = JSON.parse(req.body.orderedIds || '[]');
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: false, message: 'No order data' });
    }
    const bulkOps = ids.map((id, i) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i * 10 } } }
    }));
    await Test.bulkWrite(bulkOps);
    res.json({ success: true });
  } catch (err) {
    console.error('reorderTests error:', err);
    res.json({ success: false, message: err.message });
  }
};

exports.downloadTestPdf = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('testSeriesId').lean();
    if (!test) return res.status(404).send('Test not found');
    const questions = await Question.find({ testId: req.params.id }).sort({ createdAt: 1 }).lean();
    res.render('admin/test-pdf', { test, questions, layout: false });
  } catch (err) {
    console.error('downloadTestPdf error:', err);
    res.status(500).send('Failed to generate PDF preview');
  }
};

exports.deleteTest = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ testId: req.params.id });
    req.flash('success', 'Test deleted');
  } catch (err) {
    req.flash('error', 'Failed to delete');
  }
  res.redirect(req.get('referer') || '/admin/tests');
};

// ─── Questions ───────────────────────────────────────────────────────────────

exports.listQuestions = async (req, res) => {
  const testId = req.query.testId;
  const tests = await Test.find().populate('testSeriesId').sort({ 'testSeriesId': 1, sortOrder: 1 }).lean();
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
      tag: tag || 'General'
    });
    await Test.findByIdAndUpdate(testId, { $inc: { totalQuestions: 1 } });
    req.flash('success', 'Question added');
  } catch (err) {
    req.flash('error', 'Failed to add question');
  }
  res.redirect(`/admin/questions?testId=${req.body.testId}`);
};

exports.updateQuestion = async (req, res) => {
  try {
    const { question, option0, option1, option2, option3, correctAnswer, explanation, tag } = req.body;
    await Question.findByIdAndUpdate(req.params.id, {
      question: question.trim(),
      options: [option0.trim(), option1.trim(), option2.trim(), option3.trim()],
      correctAnswer: parseInt(correctAnswer),
      explanation: explanation?.trim() || '',
      tag: tag?.trim() || 'General'
    });
    req.flash('success', 'Question updated');
  } catch (err) {
    req.flash('error', 'Failed to update question');
  }
  res.redirect(req.get('referer') || '/admin/questions');
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
  let cur = '', inQ = false;
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
    if (!req.file) { req.flash('error', 'Please upload a CSV file.'); return res.redirect(`/admin/questions?testId=${testId}`); }
    if (!testId)   { req.flash('error', 'Please select a test first.'); return res.redirect('/admin/questions'); }

    const content = req.file.buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines   = content.split('\n').filter(l => l.trim());
    const header  = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, ''));

    const qIdx = header.indexOf('question'), aIdx = header.indexOf('optiona'), bIdx = header.indexOf('optionb');
    const cIdx = header.indexOf('optionc'),  dIdx = header.indexOf('optiond'), ansIdx = header.indexOf('correctanswer');
    const expIdx = header.indexOf('explanation'), tagIdx = header.indexOf('tag');

    if (qIdx === -1 || aIdx === -1 || ansIdx === -1) {
      req.flash('error', 'CSV must have columns: question, optionA, optionB, optionC, optionD, correctAnswer');
      return res.redirect(`/admin/questions?testId=${testId}`);
    }

    let added = 0, failed = 0;
    for (const line of lines.slice(1)) {
      const row = parseCSVLine(line);
      try {
        const rawAns = row[ansIdx]?.trim().toUpperCase();
        const correctAnswer = ['A','B','C','D'].includes(rawAns) ? ['A','B','C','D'].indexOf(rawAns) : parseInt(rawAns);
        if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) { failed++; continue; }
        await Question.create({ testId, question: row[qIdx], options: [row[aIdx]||'',row[bIdx]||'',row[cIdx]||'',row[dIdx]||''], correctAnswer, explanation: expIdx !== -1 ? row[expIdx] : '', tag: tagIdx !== -1 ? (row[tagIdx]||'General') : 'General' });
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

exports.bulkImportExcel = async (req, res) => {
  const testId = req.body.testId || req.query.testId;
  try {
    if (!req.file) { req.flash('error', 'Please upload an Excel file (.xlsx).'); return res.redirect(`/admin/questions?testId=${testId}`); }
    if (!testId)   { req.flash('error', 'Please select a test first.'); return res.redirect('/admin/questions'); }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

    if (!rows.length) { req.flash('error', 'Excel file is empty.'); return res.redirect(`/admin/questions?testId=${testId}`); }

    const normalise = str => String(str).toLowerCase().replace(/\s+/g, '');
    const headers = Object.keys(rows[0]).reduce((map, key) => { map[normalise(key)] = key; return map; }, {});
    const col = name => headers[name] || headers[normalise(name)];

    const qCol = col('question'), aCol = col('optiona'), bCol = col('optionb'), cCol = col('optionc');
    const dCol = col('optiond'), ansCol = col('correctanswer'), expCol = col('explanation'), tagCol = col('tag');

    if (!qCol || !aCol || !ansCol) {
      req.flash('error', 'Excel must have columns: question, optionA, optionB, optionC, optionD, correctAnswer');
      return res.redirect(`/admin/questions?testId=${testId}`);
    }

    let added = 0, failed = 0;
    for (const row of rows) {
      try {
        const rawAns = String(row[ansCol]||'').trim().toUpperCase();
        const correctAnswer = ['A','B','C','D'].includes(rawAns) ? ['A','B','C','D'].indexOf(rawAns) : parseInt(rawAns);
        if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) { failed++; continue; }
        const questionText = String(row[qCol]||'').trim();
        if (!questionText) { failed++; continue; }
        await Question.create({ testId, question: questionText, options: [String(row[aCol]||'').trim(),String(row[bCol]||'').trim(),String(row[cCol]||'').trim(),String(row[dCol]||'').trim()], correctAnswer, explanation: expCol ? String(row[expCol]||'').trim() : '', tag: tagCol ? (String(row[tagCol]||'').trim()||'General') : 'General' });
        added++;
      } catch { failed++; }
    }
    await Test.findByIdAndUpdate(testId, { $inc: { totalQuestions: added } });
    req.flash('success', `Excel import complete — ${added} added, ${failed} failed.`);
  } catch (err) {
    console.error('Excel import error:', err);
    req.flash('error', 'Excel import failed. Ensure the file is a valid .xlsx.');
  }
  res.redirect(`/admin/questions?testId=${testId}`);
};

// ─── Users ───────────────────────────────────────────────────────────────────

exports.listUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.render('admin/users', { title: 'Users', users, error: req.flash('error'), success: req.flash('success') });
};

exports.loginAsUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) { req.flash('error', 'User not found'); return res.redirect('/admin/users'); }
    req.session.adminImpersonating = req.session.adminId;
    req.session.userId = user._id.toString();
    res.redirect('/dashboard');
  } catch (e) { req.flash('error', 'Failed'); res.redirect('/admin/users'); }
};

exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { req.flash('error', 'User not found'); return res.redirect('/admin/users'); }
    user.isActive = !user.isActive;
    await user.save();
    req.flash('success', user.isActive ? 'Student enabled' : 'Student disabled');
  } catch (e) {
    req.flash('error', 'Failed to update status');
  }
  res.redirect('/admin/users');
};

// ─── Organizations ────────────────────────────────────────────────────────────

exports.listOrgs = async (req, res) => {
  const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
  const studentCounts = await OrgStudent.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$orgId', count: { $sum: 1 } } }]);
  const countMap = {};
  studentCounts.forEach(s => { countMap[s._id.toString()] = s.count; });
  res.render('admin/organizations', { title: 'Organizations', orgs: orgs.map(o => ({ ...o, studentCount: countMap[o._id.toString()] || 0 })), error: req.flash('error'), success: req.flash('success') });
};

exports.loginAsOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).lean();
    if (!org) { req.flash('error', 'Organization not found'); return res.redirect('/admin/organizations'); }
    req.session.adminImpersonating = req.session.adminId;
    req.session.orgId = org._id.toString();
    res.redirect('/org/dashboard');
  } catch (e) { req.flash('error', 'Failed'); res.redirect('/admin/organizations'); }
};

exports.stopImpersonation = (req, res) => {
  if (req.session.adminImpersonating) {
    req.session.adminId = req.session.adminImpersonating;
    delete req.session.adminImpersonating;
  }
  delete req.session.userId;
  delete req.session.orgId;
  res.redirect('/admin/dashboard');
};

// ─── Payments ─────────────────────────────────────────────────────────────────

exports.listPayments = async (req, res) => {
  const payments = await Payment.find().populate('userId', 'email name').populate('testSeriesId', 'title price').sort({ createdAt: -1 }).limit(300).lean();
  const totalRevenue = payments.filter(p => p.status === 'success').reduce((s, p) => s + (p.amount || 0), 0);
  res.render('admin/payments', { title: 'Payments & Invoices', payments, totalRevenue });
};

exports.downloadOrderPdf = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'email name')
      .populate('testSeriesId', 'title price')
      .lean();
    if (!payment) return res.status(404).send('Order not found');
    res.render('admin/order-pdf', { payment, layout: false });
  } catch (err) {
    console.error('downloadOrderPdf error:', err);
    res.status(500).send('Failed to generate order summary');
  }
};

// ─── Testimonials ─────────────────────────────────────────────────────────────

exports.listTestimonials = async (req, res) => {
  const filter = req.query.status || 'pending';
  const testimonials = await Testimonial.find(filter === 'all' ? {} : { status: filter }).sort({ createdAt: -1 }).lean();
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

// ─── Results ──────────────────────────────────────────────────────────────────

exports.listResults = async (req, res) => {
  const attempts = await Attempt.find({ status: 'submitted' }).populate('userId', 'email').populate('testId', 'title').sort({ submittedAt: -1 }).limit(100).lean();
  res.render('admin/results', { title: 'Test Results', attempts });
};

// ─── Site Settings ────────────────────────────────────────────────────────────

exports.showSettings = async (req, res) => {
  const settings = await SiteSettings.getAll();
  res.render('admin/settings', { title: 'Site Settings', settings, error: req.flash('error'), success: req.flash('success') });
};

exports.saveSettings = async (req, res) => {
  try {
    const { hero_heading, hero_sub } = req.body;
    await Promise.all([
      SiteSettings.set('hero_heading', hero_heading || ''),
      SiteSettings.set('hero_sub', hero_sub || '')
    ]);
    req.flash('success', 'Settings saved');
  } catch (err) {
    req.flash('error', 'Failed to save settings');
  }
  res.redirect('/admin/settings');
};

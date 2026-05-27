const User = require('../models/User');
const { TestSeries, Test } = require('../models/Exam');
const { Attempt } = require('../models/Attempt');
const Testimonial = require('../models/Testimonial');

exports.showDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    const purchasedSeriesIds = user.purchasedTests.map(pt => pt.testSeriesId);

    const purchasedSeries = await TestSeries.find({
      _id: { $in: purchasedSeriesIds }
    }).populate('examId').lean();

    // Get tests for each series
    const seriesWithTests = await Promise.all(
      purchasedSeries.map(async (series) => {
        const tests = await Test.find({ testSeriesId: series._id, isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
        const attempts = await Attempt.find({ userId: user._id, status: 'submitted' }).lean();
        const attemptedTestIds = attempts.map(a => a.testId.toString());

        const testsWithStatus = tests.map(test => ({
          ...test,
          attempted: attemptedTestIds.includes(test._id.toString()),
          latestAttempt: attempts.find(a => a.testId.toString() === test._id.toString())
        }));

        return { ...series, tests: testsWithStatus };
      })
    );

    const totalAttempts = await Attempt.countDocuments({ userId: user._id, status: 'submitted' });

    // Only series where user has at least one submitted attempt → eligible to review
    const attemptedSeries = seriesWithTests.filter(s => s.tests.some(t => t.attempted));
    const examMap = {};
    attemptedSeries.forEach(s => {
      if (s.examId) examMap[s.examId._id.toString()] = s.examId;
    });
    const reviewableExams = Object.values(examMap);
    const reviewableSeries = attemptedSeries.map(s => ({
      _id: s._id, title: s.title, examId: s.examId ? s.examId._id.toString() : ''
    }));

    // User's series reviews, keyed by series _id string
    const allMySeriesReviews = await Testimonial.find({ userId: user._id, type: 'series' }).lean();
    const myReviewsMap = {};
    allMySeriesReviews.forEach(r => {
      if (r.refId) myReviewsMap[r.refId.toString()] = r;
    });

    res.render('dashboard', {
      title: `My Dashboard — ${process.env.APP_NAME}`,
      user,
      seriesWithTests,
      totalAttempts,
      reviewableExams,
      reviewableSeries,
      myReviewsMap,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
};

exports.submitTestimonial = async (req, res) => {
  try {
    const { refId, name, role, text, rating } = req.body;
    if (!refId) { req.flash('error', 'Please select a mock test to review.'); return res.redirect('/dashboard'); }
    if (!name || !text) { req.flash('error', 'Name and review text are required.'); return res.redirect('/dashboard'); }

    const userFull = await User.findById(req.user._id);
    if (!userFull.hasPurchased(refId)) {
      req.flash('error', 'You can only review a mock test you have purchased.');
      return res.redirect('/dashboard');
    }

    await Testimonial.findOneAndUpdate(
      { userId: req.user._id, type: 'series', refId },
      { userId: req.user._id, type: 'series', refId, name: name.trim(), role: role?.trim() || '', text: text.trim().slice(0, 400), rating: parseInt(rating) || 5, status: 'pending' },
      { upsert: true, new: true }
    );
    req.flash('success', 'Thank you! Your review has been submitted for approval.');
  } catch (err) {
    console.error('Submit testimonial error:', err);
    req.flash('error', 'Failed to submit review.');
  }
  res.redirect('/dashboard');
};

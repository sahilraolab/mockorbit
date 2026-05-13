const User = require('../models/User');
const { TestSeries, Test } = require('../models/Exam');
const { Attempt } = require('../models/Attempt');

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
        const tests = await Test.find({ testSeriesId: series._id, isActive: true }).lean();
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

    res.render('dashboard', {
      title: `My Dashboard — ${process.env.APP_NAME}`,
      user,
      seriesWithTests,
      totalAttempts,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
};

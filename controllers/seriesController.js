const { Exam, TestSeries, Test } = require('../models/Exam');

exports.listByExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ slug: req.params.examSlug }).lean();
    if (!exam) {
      req.flash('error', 'Exam not found');
      return res.redirect('/');
    }

    const series = await TestSeries.find({ examId: exam._id, isActive: true }).lean();

    res.render('test-series', {
      title: `${exam.name} Test Series — ${process.env.APP_NAME}`,
      exam,
      series,
      user: req.user || null,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('List series error:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
};

exports.showSeries = async (req, res) => {
  try {
    const series = await TestSeries.findById(req.params.id).populate('examId').lean();
    if (!series) {
      req.flash('error', 'Test series not found');
      return res.redirect('/');
    }

    const hasPurchased = req.user ? req.user.hasPurchased(series._id) : false;

    res.render('series-detail', {
      title: `${series.title} — ${process.env.APP_NAME}`,
      series,
      hasPurchased,
      user: req.user || null,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Show series error:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
};

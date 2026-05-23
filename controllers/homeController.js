const { Exam, TestSeries } = require('../models/Exam');
const Testimonial = require('../models/Testimonial');

exports.home = async (req, res) => {
  try {
    const [exams, testimonials, tickerSeries] = await Promise.all([
      Exam.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
      Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(6).lean(),
      TestSeries.find({ isActive: true, orgId: { $exists: false } })
        .populate('examId', 'name slug icon examDuration totalMarks conductedBy')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);
    res.render('home', {
      title: `${process.env.APP_NAME} — Crack Your Exam`,
      exams,
      testimonials,
      tickerSeries,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Home error:', err);
    res.render('home', { title: process.env.APP_NAME, exams: [], testimonials: [], tickerSeries: [], error: [], success: [] });
  }
};

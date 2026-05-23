const { Exam } = require('../models/Exam');
const Testimonial = require('../models/Testimonial');

exports.home = async (req, res) => {
  try {
    const [exams, testimonials] = await Promise.all([
      Exam.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
      Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(6).lean()
    ]);
    res.render('home', {
      title: `${process.env.APP_NAME} — Crack Your Exam`,
      exams,
      testimonials,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Home error:', err);
    res.render('home', { title: process.env.APP_NAME, exams: [], testimonials: [], error: [], success: [] });
  }
};

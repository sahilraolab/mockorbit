const { Exam } = require('../models/Exam');

exports.home = async (req, res) => {
  try {
    const exams = await Exam.find({}).lean();
    res.render('home', {
      title: `${process.env.APP_NAME} — Crack Your Exam`,
      exams,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Home error:', err);
    res.render('home', { title: process.env.APP_NAME, exams: [], error: [], success: [] });
  }
};

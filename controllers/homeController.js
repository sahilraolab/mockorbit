const { Exam, TestSeries } = require('../models/Exam');
const Testimonial = require('../models/Testimonial');

exports.home = async (req, res) => {
  try {
    const [series, testimonials] = await Promise.all([
      TestSeries.find({ isActive: true, orgId: { $exists: false } })
        .populate('examId', 'name slug icon category examLevel language conductedBy examDuration totalMarks frequency eligibility')
        .sort({ createdAt: -1 })
        .lean(),
      Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(6).lean()
    ]);

    // Build unique category + language lists for filters
    // Only mockLanguages drives the language filter — exam.language is not shown
    const categorySet = new Set();
    const languageSet = new Set();
    series.forEach(s => {
      const exam = s.examId || {};
      if (exam.category) categorySet.add(exam.category);
      (s.mockLanguages || []).forEach(l => languageSet.add(l));
    });

    const categoryOrder = ['Law Entrance','Judiciary','SSC','Banking','UPSC','State PSC','Railway','Defence','Teaching','Other'];
    const categories = categoryOrder.filter(c => categorySet.has(c));
    categorySet.forEach(c => { if (!categories.includes(c)) categories.push(c); });
    const languages = [...languageSet].sort();

    res.render('home', {
      title: `${process.env.APP_NAME} — Crack Your Exam`,
      series,
      categories,
      languages,
      testimonials,
      // keep backward-compat: hero still uses exams for the mini card grid
      exams: [...new Map(series.filter(s => s.examId).map(s => [s.examId._id.toString(), s.examId])).values()].slice(0, 4),
      tickerSeries: series.slice(0, 20),
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Home error:', err);
    res.render('home', { title: process.env.APP_NAME, series: [], categories: [], languages: [], exams: [], testimonials: [], tickerSeries: [], error: [], success: [] });
  }
};

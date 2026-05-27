const { TestSeries, Question } = require('../models/Exam');
const Testimonial = require('../models/Testimonial');
const SiteSettings = require('../models/SiteSettings');

exports.home = async (req, res) => {
  try {
    const [series, testimonials, totalQuestions, siteSettings] = await Promise.all([
      TestSeries.find({ isActive: true, orgId: { $exists: false } })
        .populate('examId', 'name slug icon category examLevel language conductedBy examDuration totalMarks frequency eligibility')
        .sort({ createdAt: -1 })
        .lean(),
      Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(6).lean(),
      Question.countDocuments(),
      SiteSettings.getAll()
    ]);

    // Get unique topic tags from questions (exclude "General")
    const allTags = await Question.distinct('tag');
    const topics = allTags.filter(t => t && t.toLowerCase() !== 'general').sort();

    // Build unique category + language lists for filters
    const categorySet = new Set();
    const languageSet = new Set();
    series.forEach(s => {
      // category comes directly from series, or falls back to exam.category for old records
      const cat = s.category || (s.examId && s.examId.category);
      if (cat) categorySet.add(cat);
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
      exams: [...new Map(series.filter(s => s.examId).map(s => [s.examId._id.toString(), s.examId])).values()].slice(0, 4),
      tickerSeries: series.slice(0, 20),
      totalQuestions,
      topics,        // unique topic tags for hero grid animation
      siteSettings,  // admin-editable hero heading + sub text
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Home error:', err);
    res.render('home', {
      title: process.env.APP_NAME,
      series: [], categories: [], languages: [], exams: [], testimonials: [],
      tickerSeries: [], totalQuestions: 0, topics: [], siteSettings: {},
      error: [], success: []
    });
  }
};

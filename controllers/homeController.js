const { TestSeries, Test, Question } = require('../models/Exam');
const Testimonial = require('../models/Testimonial');
const SiteSettings = require('../models/SiteSettings');

exports.home = async (req, res) => {
  try {
    const [series, testimonials, totalQuestions, siteSettings, allTags, testsAgg] = await Promise.all([
      TestSeries.find({ isActive: true, orgId: { $exists: false } })
        .populate('examId', 'name slug icon category examLevel language conductedBy examDuration totalMarks frequency eligibility')
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean(),
      Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(6).lean(),
      Question.countDocuments(),
      SiteSettings.getAll(),
      Question.distinct('tag'),
      // Sum totalQuestions per series via Test documents
      Test.aggregate([
        { $group: { _id: '$testSeriesId', totalQs: { $sum: '$totalQuestions' } } }
      ])
    ]);

    // Map seriesId → total question count
    const seriesQsMap = {};
    testsAgg.forEach(r => { seriesQsMap[r._id.toString()] = r.totalQs; });
    series.forEach(s => { s._totalQuestions = seriesQsMap[s._id.toString()] || 0; });

    // Get unique topic tags from questions (exclude "General")
    const topics = allTags.filter(t => t && t.toLowerCase() !== 'general').sort();

    // Build unique category + language lists for filters
    const categorySet = new Set();
    const languageSet = new Set();
    series.forEach(s => {
      const cat = s.category || (s.examId && s.examId.category);
      if (cat) categorySet.add(cat);
      (s.mockLanguages || []).forEach(l => languageSet.add(l));
    });

    const categoryOrder = ['Law Entrance','Judiciary','SSC','Banking','UPSC','State PSC','Railway','Defence','Teaching','Other'];
    const categories = categoryOrder.filter(c => categorySet.has(c));
    categorySet.forEach(c => { if (!categories.includes(c)) categories.push(c); });
    const languages = [...languageSet].sort();

    // Featured series for hero card — first (highest sortOrder priority) active series
    let featuredSeries = null;
    let featuredTopics = [];
    if (series.length > 0) {
      featuredSeries = series[0];
      // Fetch tests for this series, then get top topics by question count
      const featuredTests = await Test.find({ testSeriesId: featuredSeries._id }).lean();
      const featuredTestIds = featuredTests.map(t => t._id);
      if (featuredTestIds.length > 0) {
        const topicAgg = await Question.aggregate([
          { $match: { testId: { $in: featuredTestIds } } },
          { $group: { _id: '$tag', count: { $sum: 1 } } },
          { $match: { _id: { $ne: null }, _id: { $not: /^general$/i } } },
          { $sort: { count: -1 } },
          { $limit: 3 }
        ]);
        featuredTopics = topicAgg.map(t => ({ name: t._id, count: t.count }));
        // Attach test count to featuredSeries
        featuredSeries = { ...featuredSeries, _testCount: featuredTests.length };
      }
    }

    res.render('home', {
      title: `${process.env.APP_NAME} — Crack Your Exam`,
      series,
      categories,
      languages,
      testimonials,
      exams: [...new Map(series.filter(s => s.examId).map(s => [s.examId._id.toString(), s.examId])).values()].slice(0, 4),
      tickerSeries: series.slice(0, 20),
      totalQuestions,
      topics,
      siteSettings,
      featuredSeries,
      featuredTopics,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Home error:', err);
    res.render('home', {
      title: process.env.APP_NAME,
      series: [], categories: [], languages: [], exams: [], testimonials: [],
      tickerSeries: [], totalQuestions: 0, topics: [], siteSettings: {},
      featuredSeries: null, featuredTopics: [],
      error: [], success: []
    });
  }
};

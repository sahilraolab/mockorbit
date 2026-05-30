const { Exam, TestSeries, Test, Question } = require('../models/Exam');
const Testimonial = require('../models/Testimonial');

exports.listByExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ slug: req.params.examSlug }).lean();
    if (!exam) { req.flash('error', 'Exam not found'); return res.redirect('/'); }

    const series = await TestSeries.find({ examId: exam._id, isActive: true }).lean();
    const allSeriesIds = series.map(s => s._id);

    // Approved reviews for any series in this exam
    const seriesReviews = await Testimonial.find({
      type: 'series', refId: { $in: allSeriesIds }, status: 'approved'
    }).sort({ createdAt: -1 }).limit(12).lean();

    // Annotate each review with its series title
    const seriesMap = {};
    series.forEach(s => { seriesMap[s._id.toString()] = s.title; });
    seriesReviews.forEach(r => { r.seriesTitle = seriesMap[r.refId?.toString()] || ''; });

    // Series the logged-in user has purchased for this exam
    const purchasedSeriesForExam = req.user
      ? series.filter(s => req.user.hasPurchased(s._id))
      : [];

    // User's existing reviews for this exam's series, keyed by series id
    const myReviewsMap = {};
    if (req.user && allSeriesIds.length > 0) {
      const myReviews = await Testimonial.find({
        userId: req.user._id, type: 'series', refId: { $in: allSeriesIds }
      }).lean();
      myReviews.forEach(r => { myReviewsMap[r.refId.toString()] = r; });
    }

    res.render('test-series', {
      title: `${exam.name} Test Series — ${process.env.APP_NAME}`,
      exam, series, seriesReviews, purchasedSeriesForExam, myReviewsMap,
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
    const param = req.params.slug;
    const isObjectId = /^[a-f\d]{24}$/i.test(param);

    let series;
    if (isObjectId) {
      series = await TestSeries.findById(param).populate('examId').lean();
      if (series) {
        // Generate slug if missing, then always redirect to slug URL
        if (!series.slug) {
          const base = series.title.toLowerCase().replace(/[^\w\s-]/g,'').replace(/[\s_]+/g,'-').replace(/-+/g,'-').replace(/^-+|-+$/g,'');
          let slug = base, n = 2;
          while (await TestSeries.findOne({ slug, _id: { $ne: series._id } })) slug = `${base}-${n++}`;
          await TestSeries.findByIdAndUpdate(series._id, { slug });
          series.slug = slug;
        }
        return res.redirect(301, `/series/${series.slug}`);
      }
    } else {
      series = await TestSeries.findOne({ slug: param }).populate('examId').lean();
    }

    if (!series) { req.flash('error', 'Test series not found'); return res.redirect('/'); }

    const hasPurchased = req.user ? req.user.hasPurchased(series._id) : false;

    // Fetch tests belonging to this series (sorted)
    const tests = await Test.find({ testSeriesId: series._id })
      .sort({ sortOrder: 1, createdAt: 1 }).lean();

    // Fetch all test IDs to query questions
    const testIds = tests.map(t => t._id);

    // Topics covered (distinct tags from all questions in this series)
    const topicsCovered = testIds.length > 0
      ? (await Question.distinct('tag', { testId: { $in: testIds } })).filter(Boolean).sort()
      : [];

    // Sample questions — pick up to 3 random, only show question text + options (no answer)
    let sampleQuestions = [];
    if (testIds.length > 0) {
      const totalQs = await Question.countDocuments({ testId: { $in: testIds } });
      if (totalQs > 0) {
        // Skip a random offset for variety
        const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, totalQs - 3)));
        sampleQuestions = await Question.find({ testId: { $in: testIds } })
          .skip(skip).limit(3)
          .select('question options tag').lean();
      }
    }

    const [seriesReviews, mySeriesReview] = await Promise.all([
      Testimonial.find({ type: 'series', refId: series._id, status: 'approved' })
        .sort({ createdAt: -1 }).limit(8).lean(),
      (req.user && hasPurchased)
        ? Testimonial.findOne({ userId: req.user._id, type: 'series', refId: series._id }).lean()
        : Promise.resolve(null)
    ]);

    res.render('series-detail', {
      title: `${series.title} — ${process.env.APP_NAME}`,
      series, hasPurchased, seriesReviews, mySeriesReview,
      tests, topicsCovered, sampleQuestions,
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

exports.submitReview = async (req, res) => {
  const back = req.get('referer') || '/';
  try {
    const { refId, name, role, text, rating } = req.body;

    if (!refId) {
      req.flash('error', 'Please select a mock test to review.');
      return res.redirect(back);
    }
    if (!name || !text) {
      req.flash('error', 'Name and review text are required.');
      return res.redirect(back);
    }
    if (!req.user || !req.user.hasPurchased(refId)) {
      req.flash('error', 'You can only review a mock test you have purchased.');
      return res.redirect(back);
    }

    await Testimonial.findOneAndUpdate(
      { userId: req.user._id, type: 'series', refId },
      {
        userId: req.user._id, type: 'series', refId,
        name: name.trim(), role: role?.trim() || '',
        text: text.trim().slice(0, 400),
        rating: parseInt(rating) || 5,
        status: 'pending'
      },
      { upsert: true, new: true }
    );
    req.flash('success', 'Review submitted! It will appear once approved.');
  } catch (err) {
    console.error('Submit review error:', err);
    req.flash('error', 'Failed to submit review.');
  }
  res.redirect(back);
};

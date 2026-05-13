const { Test, Question, TestSeries } = require('../models/Exam');
const { Attempt } = require('../models/Attempt');
const User = require('../models/User');

exports.startTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate('testSeriesId').lean();
    if (!test) {
      req.flash('error', 'Test not found');
      return res.redirect('/dashboard');
    }

    // Verify user has access
    const user = await User.findById(req.user._id);
    if (!user.hasPurchased(test.testSeriesId._id)) {
      req.flash('error', 'You do not have access to this test');
      return res.redirect('/dashboard');
    }

    // Check for existing in-progress attempt
    let attempt = await Attempt.findOne({
      userId: req.user._id,
      testId: test._id,
      status: 'in-progress'
    });

    const questions = await Question.find({ testId: test._id }).sort({ order: 1 }).lean();

    if (!attempt) {
      // Create new attempt
      attempt = await Attempt.create({
        userId: req.user._id,
        testId: test._id,
        answers: questions.map(q => ({ questionId: q._id, selectedOption: -1 })),
        totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0)
      });
    }

    res.render('test-interface', {
      title: `${test.title} — ${process.env.APP_NAME}`,
      test,
      questions,
      attempt,
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Start test error:', err);
    req.flash('error', 'Could not start test');
    res.redirect('/dashboard');
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, selectedOption } = req.body;
    const attempt = await Attempt.findOne({ _id: attemptId, userId: req.user._id, status: 'in-progress' });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const answerIndex = attempt.answers.findIndex(a => a.questionId.toString() === questionId);
    if (answerIndex !== -1) {
      attempt.answers[answerIndex].selectedOption = parseInt(selectedOption);
    } else {
      attempt.answers.push({ questionId, selectedOption: parseInt(selectedOption) });
    }

    await attempt.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Save answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to save answer' });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const { attemptId, timeTaken } = req.body;
    const attempt = await Attempt.findOne({ _id: attemptId, userId: req.user._id, status: 'in-progress' });

    if (!attempt) {
      req.flash('error', 'Attempt not found');
      return res.redirect('/dashboard');
    }

    // Calculate score
    const questions = await Question.find({ testId: attempt.testId }).lean();
    let score = 0;
    const tagScores = {};
    const tagCounts = {};

    questions.forEach(question => {
      const answer = attempt.answers.find(a => a.questionId.toString() === question._id.toString());
      const tag = question.tag;

      if (!tagCounts[tag]) tagCounts[tag] = { correct: 0, total: 0 };
      tagCounts[tag].total++;

      if (answer && answer.selectedOption === question.correctAnswer) {
        score += question.marks || 1;
        tagCounts[tag].correct++;
      } else if (answer && answer.selectedOption !== -1 && question.negativeMark > 0) {
        score -= question.negativeMark;
      }
    });

    // Detect weak areas (tags where accuracy < 50%)
    const weakAreas = Object.entries(tagCounts)
      .filter(([tag, counts]) => counts.total > 0 && counts.correct / counts.total < 0.5)
      .map(([tag]) => tag);

    // Calculate rank among all submitted attempts for this test
    const allAttempts = await Attempt.find({ testId: attempt.testId, status: 'submitted' }).lean();
    const higherScores = allAttempts.filter(a => a.score > score).length;
    const rank = higherScores + 1;

    // Update all ranks
    attempt.score = score;
    attempt.weakAreas = weakAreas;
    attempt.rank = rank;
    attempt.timeTaken = parseInt(timeTaken) || 0;
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    await attempt.save();

    // Update ranks for all existing attempts
    for (const a of allAttempts) {
      const newRank = allAttempts.filter(x => x.score > a.score).length + 1;
      if (newRank !== a.rank) {
        await Attempt.findByIdAndUpdate(a._id, { rank: newRank });
      }
    }

    res.redirect(`/test/result/${attempt._id}`);
  } catch (err) {
    console.error('Submit test error:', err);
    req.flash('error', 'Failed to submit test');
    res.redirect('/dashboard');
  }
};

exports.showResult = async (req, res) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      status: 'submitted'
    }).populate('testId').lean();

    if (!attempt) {
      req.flash('error', 'Result not found');
      return res.redirect('/dashboard');
    }

    const questions = await Question.find({ testId: attempt.testId._id }).sort({ order: 1 }).lean();
    const totalAttempts = await Attempt.countDocuments({ testId: attempt.testId._id, status: 'submitted' });
    const percentile = totalAttempts > 1
      ? (((totalAttempts - attempt.rank) / (totalAttempts - 1)) * 100).toFixed(1)
      : 100;

    // Build answer review
    const review = questions.map(q => {
      const userAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString());
      return {
        ...q,
        userAnswer: userAnswer ? userAnswer.selectedOption : -1,
        isCorrect: userAnswer && userAnswer.selectedOption === q.correctAnswer
      };
    });

    const accuracy = questions.length > 0
      ? ((review.filter(r => r.isCorrect).length / questions.length) * 100).toFixed(1)
      : 0;

    res.render('result', {
      title: `Result — ${process.env.APP_NAME}`,
      attempt,
      review,
      totalAttempts,
      percentile,
      accuracy,
      user: req.user,
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Show result error:', err);
    req.flash('error', 'Could not load result');
    res.redirect('/dashboard');
  }
};

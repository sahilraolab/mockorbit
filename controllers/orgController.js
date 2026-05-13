const { Organization, OrgStudent, OrgAssignment } = require('../models/Organization');
const { Attempt } = require('../models/Attempt');
const { Test, TestSeries } = require('../models/Exam');
const User = require('../models/User');

// ─── Auth ──────────────────────────────────────────────────────────────────

exports.showRegister = (req, res) => {
  res.render('org/register', {
    title: 'Register Institution — MockOrbit',
    metaDesc: 'Register your school, coaching centre, or college on MockOrbit to assign mock tests and track student performance.',
    error: req.flash('error'),
    success: req.flash('success')
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, orgType, address } = req.body;
    if (!name || !email || !password) {
      req.flash('error', 'Name, email and password are required.');
      return res.redirect('/org/register');
    }
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/org/register');
    }
    if (password.length < 8) {
      req.flash('error', 'Password must be at least 8 characters.');
      return res.redirect('/org/register');
    }
    const existing = await Organization.findOne({ email: email.toLowerCase() });
    if (existing) {
      req.flash('error', 'An account with this email already exists.');
      return res.redirect('/org/register');
    }
    const org = new Organization({ name, email, password, phone, orgType, address });
    await org.save();
    req.session.orgId = org._id.toString();
    res.redirect('/org/dashboard');
  } catch (err) {
    console.error('Org register error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/org/register');
  }
};

exports.showLogin = (req, res) => {
  if (req.session.orgId) return res.redirect('/org/dashboard');
  res.render('org/login', {
    title: 'Institution Login — MockOrbit',
    metaDesc: 'Login to your MockOrbit institution dashboard to manage students, assign tests, and track results.',
    error: req.flash('error'),
    success: req.flash('success')
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const org = await Organization.findOne({ email: email.toLowerCase() });
    if (!org || !(await org.comparePassword(password))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/org/login');
    }
    if (!org.isActive) {
      req.flash('error', 'Your account has been disabled. Contact support.');
      return res.redirect('/org/login');
    }
    req.session.orgId = org._id.toString();
    const redirectTo = req.session.returnOrgTo || '/org/dashboard';
    delete req.session.returnOrgTo;
    res.redirect(redirectTo);
  } catch (err) {
    console.error('Org login error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/org/login');
  }
};

exports.logout = (req, res) => {
  req.session.orgId = null;
  req.flash('success', 'You have been logged out.');
  res.redirect('/org/login');
};

// ─── Dashboard ────────────────────────────────────────────────────────────

exports.dashboard = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const org = await Organization.findById(orgId).lean();
    const [studentCount, assignmentCount, students] = await Promise.all([
      OrgStudent.countDocuments({ orgId, isActive: true }),
      OrgAssignment.countDocuments({ orgId }),
      OrgStudent.find({ orgId, isActive: true }).lean()
    ]);

    const studentUserIds = students.map(s => s.userId);
    const attemptCount = await Attempt.countDocuments({ userId: { $in: studentUserIds }, status: 'submitted' });

    const recentAssignments = await OrgAssignment.find({ orgId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('testId', 'title duration totalQuestions')
      .lean();

    res.render('org/dashboard', {
      title: `${org.name} — Dashboard · MockOrbit`,
      org,
      stats: { studentCount, assignmentCount, attemptCount },
      recentAssignments,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Org dashboard error:', err);
    res.redirect('/org/login');
  }
};

// ─── Students ─────────────────────────────────────────────────────────────

exports.listStudents = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const org = await Organization.findById(orgId).lean();
    const students = await OrgStudent.find({ orgId })
      .populate('userId', 'mobile createdAt')
      .lean();

    res.render('org/students', {
      title: 'Manage Students — MockOrbit',
      org,
      students,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Org students error:', err);
    res.redirect('/org/dashboard');
  }
};

exports.addStudent = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const { mobile, name, rollNumber, batch } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      req.flash('error', 'Please enter a valid 10-digit mobile number.');
      return res.redirect('/org/students');
    }
    // Find or create the User
    let user = await User.findOne({ mobile });
    if (!user) {
      user = await User.create({ mobile });
    }
    // Avoid duplicates
    const existing = await OrgStudent.findOne({ orgId, userId: user._id });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.name = name || existing.name;
        existing.rollNumber = rollNumber || existing.rollNumber;
        existing.batch = batch || existing.batch;
        await existing.save();
        req.flash('success', 'Student re-activated successfully.');
      } else {
        req.flash('error', 'Student with this mobile is already in your organisation.');
      }
      return res.redirect('/org/students');
    }
    await OrgStudent.create({ orgId, userId: user._id, name, rollNumber, batch });
    req.flash('success', 'Student added successfully.');
    res.redirect('/org/students');
  } catch (err) {
    console.error('Add student error:', err);
    req.flash('error', 'Could not add student. Please try again.');
    res.redirect('/org/students');
  }
};

exports.removeStudent = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    await OrgStudent.findOneAndUpdate(
      { _id: req.params.id, orgId },
      { isActive: false }
    );
    req.flash('success', 'Student removed.');
    res.redirect('/org/students');
  } catch (err) {
    req.flash('error', 'Could not remove student.');
    res.redirect('/org/students');
  }
};

// ─── Assignments ──────────────────────────────────────────────────────────

exports.listAssignments = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const org = await Organization.findById(orgId).lean();
    const [assignments, tests] = await Promise.all([
      OrgAssignment.find({ orgId })
        .sort({ createdAt: -1 })
        .populate('testId', 'title duration totalQuestions testSeriesId')
        .lean(),
      Test.find({ isActive: true }).populate('testSeriesId', 'title').lean()
    ]);

    res.render('org/assignments', {
      title: 'Assignments — MockOrbit',
      org,
      assignments,
      tests,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Org assignments error:', err);
    res.redirect('/org/dashboard');
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const { testId, title, instructions, dueDate, assignAll } = req.body;
    if (!testId || !title) {
      req.flash('error', 'Test and title are required.');
      return res.redirect('/org/assignments');
    }
    const isAssignAll = assignAll === 'on' || assignAll === 'true' || assignAll === '1';
    let assignedStudents = [];
    if (!isAssignAll) {
      const students = await OrgStudent.find({ orgId, isActive: true }).lean();
      assignedStudents = students.map(s => s.userId);
    }
    await OrgAssignment.create({
      orgId,
      testId,
      title,
      instructions,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignAll: isAssignAll,
      assignedStudents: isAssignAll ? [] : assignedStudents
    });
    req.flash('success', 'Assignment created successfully.');
    res.redirect('/org/assignments');
  } catch (err) {
    console.error('Create assignment error:', err);
    req.flash('error', 'Could not create assignment. Please try again.');
    res.redirect('/org/assignments');
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    await OrgAssignment.findOneAndDelete({ _id: req.params.id, orgId });
    req.flash('success', 'Assignment deleted.');
    res.redirect('/org/assignments');
  } catch (err) {
    req.flash('error', 'Could not delete assignment.');
    res.redirect('/org/assignments');
  }
};

// ─── Results ──────────────────────────────────────────────────────────────

exports.results = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const org = await Organization.findById(orgId).lean();

    // Get all active students in this org
    const students = await OrgStudent.find({ orgId, isActive: true })
      .populate('userId', 'mobile')
      .lean();
    const studentUserIds = students.map(s => s.userId?._id || s.userId);
    const studentMap = {};
    students.forEach(s => {
      const uid = (s.userId?._id || s.userId).toString();
      studentMap[uid] = s;
    });

    // Filter by assignment if provided
    const assignmentId = req.query.assignment;
    let testIdFilter = null;
    let selectedAssignment = null;
    if (assignmentId) {
      selectedAssignment = await OrgAssignment.findOne({ _id: assignmentId, orgId })
        .populate('testId', 'title')
        .lean();
      if (selectedAssignment) testIdFilter = selectedAssignment.testId._id;
    }

    const query = { userId: { $in: studentUserIds }, status: 'submitted' };
    if (testIdFilter) query.testId = testIdFilter;

    const attempts = await Attempt.find(query)
      .sort({ submittedAt: -1 })
      .populate('testId', 'title duration totalQuestions')
      .populate('userId', 'mobile')
      .lean();

    // Attach student name/roll to each attempt
    const enriched = attempts.map(a => ({
      ...a,
      studentInfo: studentMap[(a.userId?._id || a.userId).toString()] || null
    }));

    const assignments = await OrgAssignment.find({ orgId })
      .sort({ createdAt: -1 })
      .populate('testId', 'title')
      .lean();

    res.render('org/results', {
      title: 'Student Results — MockOrbit',
      org,
      attempts: enriched,
      assignments,
      selectedAssignment,
      studentCount: students.length,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Org results error:', err);
    res.redirect('/org/dashboard');
  }
};

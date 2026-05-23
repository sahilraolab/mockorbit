const { Organization, OrgStudent, OrgAssignment } = require('../models/Organization');
const { Attempt } = require('../models/Attempt');
const { Test, TestSeries, Question } = require('../models/Exam');
const User = require('../models/User');
const paymentService = require('../services/paymentService');

// ─── Plans ────────────────────────────────────────────────────────────────
const PLANS = {
  starter_monthly: { key: 'starter_monthly', name: 'Starter', billing: 'monthly', studentsLimit: 100,  amount: 5000 },
  starter_yearly:  { key: 'starter_yearly',  name: 'Starter', billing: 'yearly',  studentsLimit: 100,  amount: 55000 },
  growth_monthly:  { key: 'growth_monthly',  name: 'Growth',  billing: 'monthly', studentsLimit: 200,  amount: 9000 },
  growth_yearly:   { key: 'growth_yearly',   name: 'Growth',  billing: 'yearly',  studentsLimit: 200,  amount: 99000 },
  pro_monthly:     { key: 'pro_monthly',     name: 'Pro',     billing: 'monthly', studentsLimit: 500,  amount: 22500 },
  pro_yearly:      { key: 'pro_yearly',      name: 'Pro',     billing: 'yearly',  studentsLimit: 500,  amount: 247500 },
};

// ─── CSV helper ────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else { cur += line[i]; }
  }
  cols.push(cur.trim());
  return cols;
}

function parseCSV(buffer) {
  const lines = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  return lines.map(parseCSVLine);
}

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
      .populate('userId', 'email createdAt')
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
    const { email, name, rollNumber, batch } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      req.flash('error', 'Please enter a valid email address.');
      return res.redirect('/org/students');
    }
    const normalEmail = email.trim().toLowerCase();

    // Enforce plan student limit
    const org = await Organization.findById(orgId).lean();
    const limit = org.subscription?.studentsLimit || 0;
    const currentCount = await OrgStudent.countDocuments({ orgId, isActive: true });
    if (currentCount >= limit) {
      req.flash('error', `Your plan allows up to ${limit} students. Upgrade to add more.`);
      return res.redirect('/org/students');
    }

    let user = await User.findOne({ email: normalEmail });
    if (!user) user = await User.create({ email: normalEmail });

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
        req.flash('error', 'Student with this email is already in your organisation.');
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

exports.bulkAddStudents = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    if (!req.file) {
      req.flash('error', 'Please upload a CSV file.');
      return res.redirect('/org/students');
    }
    const org = await Organization.findById(orgId).lean();
    const limit = org.subscription?.studentsLimit || 0;
    const currentCount = await OrgStudent.countDocuments({ orgId, isActive: true });

    const rows = parseCSV(req.file.buffer);
    const header = rows[0].map(h => h.toLowerCase());
    const nameIdx  = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const rollIdx  = header.indexOf('rollnumber');
    const batchIdx = header.indexOf('batch');

    if (emailIdx === -1) {
      req.flash('error', 'CSV must have an "email" column.');
      return res.redirect('/org/students');
    }

    const dataRows = rows.slice(1);
    let added = 0, skipped = 0, failed = 0;

    for (const row of dataRows) {
      const rawEmail = row[emailIdx]?.trim().toLowerCase();
      if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) { failed++; continue; }

      if (currentCount + added >= limit) { skipped++; continue; }

      try {
        let user = await User.findOne({ email: rawEmail });
        if (!user) user = await User.create({ email: rawEmail });

        const existing = await OrgStudent.findOne({ orgId, userId: user._id });
        if (existing) {
          if (!existing.isActive) {
            existing.isActive = true;
            if (nameIdx !== -1 && row[nameIdx]) existing.name = row[nameIdx];
            if (rollIdx !== -1 && row[rollIdx]) existing.rollNumber = row[rollIdx];
            if (batchIdx !== -1 && row[batchIdx]) existing.batch = row[batchIdx];
            await existing.save();
            added++;
          } else { skipped++; }
        } else {
          await OrgStudent.create({
            orgId,
            userId: user._id,
            name: nameIdx !== -1 ? row[nameIdx] : undefined,
            rollNumber: rollIdx !== -1 ? row[rollIdx] : undefined,
            batch: batchIdx !== -1 ? row[batchIdx] : undefined,
          });
          added++;
        }
      } catch { failed++; }
    }

    req.flash('success', `Bulk upload complete — ${added} added, ${skipped} skipped, ${failed} failed.`);
    res.redirect('/org/students');
  } catch (err) {
    console.error('Bulk add students error:', err);
    req.flash('error', 'Bulk upload failed. Please check your CSV format.');
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
      .populate('userId', 'email')
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
      .populate('userId', 'email')
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

// ─── Plans ────────────────────────────────────────────────────────────────

exports.showPlans = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const org = await Organization.findById(orgId).lean();
    res.render('org/plans', {
      title: 'Choose a Plan — MockOrbit Institution Portal',
      org,
      plans: PLANS,
      razorpayKeyId: paymentService.getRazorpayKeyId(),
      useMockPayment: paymentService.isMock(),
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Show plans error:', err);
    res.redirect('/org/dashboard');
  }
};

exports.createPlanOrder = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const { planKey } = req.body;
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan selected.' });

    if (paymentService.isMock()) {
      await activatePlan(orgId, plan, 'mock_order_' + Date.now(), 'mock_pay_' + Date.now());
      return res.json({ success: true, redirect: '/org/dashboard', freeAccess: true });
    }

    const amount = plan.amount * 100;
    const receipt = `org_${orgId}_${Date.now()}`.slice(0, 40);
    const order = await paymentService.createOrder(amount, 'INR', receipt);

    await Organization.findByIdAndUpdate(orgId, {
      'subscription.planKey': planKey,
      'subscription.planName': plan.name,
      'subscription.billing': plan.billing,
      'subscription.studentsLimit': plan.studentsLimit,
      'subscription.amount': plan.amount,
      'subscription.razorpayOrderId': order.id,
      'subscription.status': 'pending'
    });

    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency, planName: plan.name });
  } catch (err) {
    console.error('Create plan order error:', err);
    res.status(500).json({ success: false, message: 'Payment initiation failed. Please try again.' });
  }
};

exports.verifyPlanPayment = async (req, res) => {
  try {
    const orgId = req.session.orgId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details.' });
    }

    const isValid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Contact support.' });
    }

    const org = await Organization.findById(orgId).lean();
    const plan = PLANS[org.subscription?.planKey];
    if (!plan) return res.status(400).json({ success: false, message: 'Plan not found.' });

    await activatePlan(orgId, plan, razorpay_order_id, razorpay_payment_id);
    res.json({ success: true, redirect: '/org/dashboard' });
  } catch (err) {
    console.error('Verify plan payment error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Contact support.' });
  }
};

async function activatePlan(orgId, plan, orderId, paymentId) {
  const now = new Date();
  const endDate = new Date(now);
  if (plan.billing === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  await Organization.findByIdAndUpdate(orgId, {
    'subscription.planKey': plan.key,
    'subscription.planName': plan.name,
    'subscription.billing': plan.billing,
    'subscription.studentsLimit': plan.studentsLimit,
    'subscription.amount': plan.amount,
    'subscription.startDate': now,
    'subscription.endDate': endDate,
    'subscription.razorpayOrderId': orderId,
    'subscription.razorpayPaymentId': paymentId,
    'subscription.status': 'active'
  });
}

const express = require('express');

// Org routes
const orgRouter = express.Router();
const orgController = require('../controllers/orgController');
const { requireOrg, requireOrgPlan } = require('../middlewares/auth');
const multer = require('multer');
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  cb(null, file.mimetype === 'text/csv' || file.originalname.endsWith('.csv'));
}});

const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const ok = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls') ||
              file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              file.mimetype === 'application/vnd.ms-excel';
  cb(null, ok);
}});

orgRouter.get('/register', orgController.showRegister);
orgRouter.post('/register', orgController.register);
orgRouter.get('/login', orgController.showLogin);
orgRouter.post('/login', orgController.login);
orgRouter.get('/logout', orgController.logout);

// Plans (no plan gate — this IS the gate destination)
orgRouter.get('/plans', requireOrg, orgController.showPlans);
orgRouter.post('/plans/order', requireOrg, orgController.createPlanOrder);
orgRouter.post('/plans/verify', requireOrg, orgController.verifyPlanPayment);

// Gated routes — require active plan
orgRouter.get('/dashboard',  requireOrg, orgController.dashboard);
orgRouter.get('/students',   requireOrg, requireOrgPlan, orgController.listStudents);
orgRouter.post('/students/add',       requireOrg, requireOrgPlan, orgController.addStudent);
orgRouter.post('/students/bulk',      requireOrg, requireOrgPlan, csvUpload.single('csvFile'), orgController.bulkAddStudents);
orgRouter.post('/students/:id/remove',requireOrg, requireOrgPlan, orgController.removeStudent);
orgRouter.get('/assignments',           requireOrg, requireOrgPlan, orgController.listAssignments);
orgRouter.post('/assignments',          requireOrg, requireOrgPlan, orgController.createAssignment);
orgRouter.post('/assignments/:id/delete', requireOrg, requireOrgPlan, orgController.deleteAssignment);
orgRouter.get('/results', requireOrg, requireOrgPlan, orgController.results);

// Auth routes
const authRouter = express.Router();
const authController = require('../controllers/authController');
authRouter.get('/login', authController.showLogin);
authRouter.post('/send-email-otp',   authController.sendEmailOTP);
authRouter.post('/verify-email-otp', authController.verifyEmailOTP);
authRouter.get('/logout', authController.logout);

// Series routes
const seriesRouter = express.Router();
const seriesController = require('../controllers/seriesController');
seriesRouter.get('/exam/:examSlug', seriesController.listByExam);
seriesRouter.post('/review', require('../middlewares/auth').requireAuth, seriesController.submitReview);
seriesRouter.get('/:id', seriesController.showSeries);

// Payment routes
const paymentRouter = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middlewares/auth');
paymentRouter.post('/webhook', paymentController.webhook);                         // no auth — Razorpay server call
paymentRouter.get('/checkout/:seriesId', requireAuth, paymentController.showCheckout);
paymentRouter.post('/create-order/:seriesId', requireAuth, paymentController.createOrder);
paymentRouter.post('/verify', requireAuth, paymentController.verifyPayment);
paymentRouter.post('/mock-success', requireAuth, paymentController.mockPaymentSuccess);
paymentRouter.post('/free-access/:seriesId', requireAuth, paymentController.freeAccess);

// Test routes
const testRouter = express.Router();
const testController = require('../controllers/testController');
testRouter.get('/start/:testId', requireAuth, testController.startTest);
testRouter.post('/save-answer', requireAuth, testController.saveAnswer);
testRouter.post('/submit', requireAuth, testController.submitTest);
testRouter.get('/result/:attemptId', requireAuth, testController.showResult);

// Dashboard routes
const dashboardRouter = express.Router();
const dashboardController = require('../controllers/dashboardController');
dashboardRouter.get('/', requireAuth, dashboardController.showDashboard);
dashboardRouter.post('/testimonial', requireAuth, dashboardController.submitTestimonial);

// Admin routes
const adminRouter = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/auth');
adminRouter.get('/login', adminController.showLogin);
adminRouter.post('/login', adminController.login);
adminRouter.get('/logout', adminController.logout);
adminRouter.get('/dashboard', requireAdmin, adminController.dashboard);
adminRouter.get('/exams', requireAdmin, adminController.listExams);
adminRouter.post('/exams', requireAdmin, adminController.createExam);
adminRouter.post('/exams/:id/update', requireAdmin, adminController.updateExam);
adminRouter.post('/exams/:id/delete', requireAdmin, adminController.deleteExam);
adminRouter.get('/series', requireAdmin, adminController.listSeries);
adminRouter.get('/series/new', requireAdmin, adminController.showCreateSeries);
adminRouter.post('/series', requireAdmin, adminController.createSeries);
adminRouter.get('/series/:id/edit', requireAdmin, adminController.showEditSeries);
adminRouter.post('/series/:id/update', requireAdmin, adminController.updateSeries);
adminRouter.post('/series/:id/delete', requireAdmin, adminController.deleteSeries);
adminRouter.get('/tests', requireAdmin, adminController.listTests);
adminRouter.post('/tests', requireAdmin, adminController.createTest);
adminRouter.post('/tests/:id/delete', requireAdmin, adminController.deleteTest);
adminRouter.get('/questions', requireAdmin, adminController.listQuestions);
adminRouter.post('/questions', requireAdmin, adminController.createQuestion);
adminRouter.post('/questions/bulk-import', requireAdmin, csvUpload.single('csvFile'), adminController.bulkImportQuestions);
adminRouter.post('/questions/excel-import', requireAdmin, excelUpload.single('excelFile'), adminController.bulkImportExcel);
adminRouter.post('/questions/:id/delete', requireAdmin, adminController.deleteQuestion);
adminRouter.get('/users', requireAdmin, adminController.listUsers);
adminRouter.post('/users/:id/login-as', requireAdmin, adminController.loginAsUser);
adminRouter.get('/organizations', requireAdmin, adminController.listOrgs);
adminRouter.post('/organizations/:id/login-as', requireAdmin, adminController.loginAsOrg);
adminRouter.get('/stop-impersonation', adminController.stopImpersonation);
adminRouter.get('/payments', requireAdmin, adminController.listPayments);
adminRouter.get('/testimonials', requireAdmin, adminController.listTestimonials);
adminRouter.post('/testimonials/:id/approve', requireAdmin, adminController.approveTestimonial);
adminRouter.post('/testimonials/:id/reject', requireAdmin, adminController.rejectTestimonial);
adminRouter.get('/results', requireAdmin, adminController.listResults);

// API routes (public, JSON)
const apiRouter = express.Router();
const Testimonial = require('../models/Testimonial');
const { TestSeries } = require('../models/Exam');

apiRouter.get('/reviews', async (req, res) => {
  try {
    const { type = 'site', refId } = req.query;
    const filter = { status: 'approved', type };
    if (refId) filter.refId = refId;
    const reviews = await Testimonial.find(filter).sort({ createdAt: -1 }).limit(6).lean();
    res.json({ success: true, reviews });
  } catch (e) {
    res.json({ success: false, reviews: [] });
  }
});

apiRouter.get('/series-by-exam', async (req, res) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.json({ success: true, series: [] });
    const series = await TestSeries.find({ examId, isActive: true }).select('_id title').lean();
    res.json({ success: true, series });
  } catch (e) {
    res.json({ success: false, series: [] });
  }
});

module.exports = { authRouter, seriesRouter, paymentRouter, testRouter, dashboardRouter, adminRouter, orgRouter, apiRouter };

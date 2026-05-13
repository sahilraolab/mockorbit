const express = require('express');

// Org routes
const orgRouter = express.Router();
const orgController = require('../controllers/orgController');
const { requireOrg } = require('../middlewares/auth');
orgRouter.get('/register', orgController.showRegister);
orgRouter.post('/register', orgController.register);
orgRouter.get('/login', orgController.showLogin);
orgRouter.post('/login', orgController.login);
orgRouter.get('/logout', orgController.logout);
orgRouter.get('/dashboard', requireOrg, orgController.dashboard);
orgRouter.get('/students', requireOrg, orgController.listStudents);
orgRouter.post('/students/add', requireOrg, orgController.addStudent);
orgRouter.post('/students/:id/remove', requireOrg, orgController.removeStudent);
orgRouter.get('/assignments', requireOrg, orgController.listAssignments);
orgRouter.post('/assignments', requireOrg, orgController.createAssignment);
orgRouter.post('/assignments/:id/delete', requireOrg, orgController.deleteAssignment);
orgRouter.get('/results', requireOrg, orgController.results);

// Auth routes
const authRouter = express.Router();
const authController = require('../controllers/authController');
authRouter.get('/login', authController.showLogin);
authRouter.post('/send-otp', authController.sendOTP);
authRouter.post('/verify-otp', authController.verifyOTP);
authRouter.get('/logout', authController.logout);

// Series routes
const seriesRouter = express.Router();
const seriesController = require('../controllers/seriesController');
seriesRouter.get('/exam/:examSlug', seriesController.listByExam);
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
adminRouter.post('/questions/:id/delete', requireAdmin, adminController.deleteQuestion);
adminRouter.get('/users', requireAdmin, adminController.listUsers);
adminRouter.get('/results', requireAdmin, adminController.listResults);

module.exports = { authRouter, seriesRouter, paymentRouter, testRouter, dashboardRouter, adminRouter, orgRouter };

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const mongoose = require('mongoose');

const { authRouter, seriesRouter, paymentRouter, testRouter, dashboardRouter, adminRouter, orgRouter } = require('./routes/routes');
const indexRouter = require('./routes/index');
const { loadUser } = require('./middlewares/auth');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Raw body capture for Razorpay webhook signature verification
// Must come before express.json() — only applies to /payment/webhook
app.use('/payment/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body; // Buffer
  next();
});

// Body parsing (all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Flash messages
app.use(flash());

// Load current user into locals
app.use(loadUser);

// Global template locals
app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'PrepFlow';
  res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', indexRouter);
app.use('/org', orgRouter);
app.use('/auth', authRouter);
app.use('/series', seriesRouter);
app.use('/payment', paymentRouter);
app.use('/test', testRouter);
app.use('/dashboard', dashboardRouter);
app.use('/admin', adminRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 — Page Not Found',
    user: req.user || null
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('404', {
    title: 'Something went wrong',
    user: req.user || null
  });
});

module.exports = app;

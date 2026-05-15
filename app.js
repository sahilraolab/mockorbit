require('dotenv').config();

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');

const { authRouter, seriesRouter, paymentRouter, testRouter, dashboardRouter, adminRouter, orgRouter } = require('./routes/routes');
const indexRouter = require('./routes/index');
const sitemapRouter = require('./routes/sitemapRoute');
const { loadUser } = require('./middlewares/auth');

const app = express();

// ------------------------------------------------------------------
// PRODUCTION SECURITY — Helmet (safe Content-Security-Policy)
// ------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",          // EJS inline scripts
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
      ],
      styleSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:   ["'self'", "https://fonts.gstatic.com"],
      imgSrc:    ["'self'", "data:", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
      connectSrc:["'self'", "https://www.google-analytics.com", "https://api.razorpay.com"],
      frameSrc:  ["https://api.razorpay.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ------------------------------------------------------------------
// GZIP COMPRESSION — significant bandwidth savings
// ------------------------------------------------------------------
app.use(compression());

// ------------------------------------------------------------------
// VIEW ENGINE
// ------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ------------------------------------------------------------------
// STATIC FILES — long-lived cache for hashed assets
// ------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '30d' : '0',
  etag: true,
  lastModified: true,
}));

// ------------------------------------------------------------------
// RAW BODY for Razorpay webhook (must precede express.json)
// ------------------------------------------------------------------
app.use('/payment/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});

// ------------------------------------------------------------------
// BODY PARSING
// ------------------------------------------------------------------
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ------------------------------------------------------------------
// SESSION
// ------------------------------------------------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  }
}));

// ------------------------------------------------------------------
// FLASH MESSAGES
// ------------------------------------------------------------------
app.use(flash());

// ------------------------------------------------------------------
// AUTH MIDDLEWARE
// ------------------------------------------------------------------
app.use(loadUser);

// ------------------------------------------------------------------
// GLOBAL TEMPLATE LOCALS
// ------------------------------------------------------------------
app.use((req, res, next) => {
  res.locals.appName    = process.env.APP_NAME || 'MockOrbit';
  res.locals.appUrl     = process.env.APP_URL  || 'http://localhost:3000';
  res.locals.user       = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.title      = 'MockOrbit — India\'s Best Mock Test Platform';
  res.locals.metaDesc   = 'Full-length mock tests for Judiciary, CLAT, SSC CGL, Banking & 20+ competitive exams. Real-time rank analytics and expert solutions.';
  res.locals.metaKeywords = 'mock test, online test series, judiciary mock test, CLAT, SSC CGL, banking PO preparation India';
  next();
});

// ------------------------------------------------------------------
// FORCE HTTPS in production
// ------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------
app.use('/', sitemapRouter);   // /sitemap.xml
app.use('/', indexRouter);
app.use('/org', orgRouter);
app.use('/auth', authRouter);
app.use('/series', seriesRouter);
app.use('/payment', paymentRouter);
app.use('/test', testRouter);
app.use('/dashboard', dashboardRouter);
app.use('/admin', adminRouter);

// ------------------------------------------------------------------
// 404
// ------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 — Page Not Found | MockOrbit',
    user:  req.user || null,
    metaDesc: 'The page you are looking for could not be found on MockOrbit.',
  });
});

// ------------------------------------------------------------------
// ERROR HANDLER
// ------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[MockOrbit Error]', err.stack || err);
  res.status(500).render('404', {
    title: 'Something went wrong | MockOrbit',
    user:  req.user || null,
    metaDesc: 'An unexpected error occurred.',
  });
});

module.exports = app;

const User = require('../models/User');
const { Organization } = require('../models/Organization');

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    // Only store returnTo for GET requests — POST URLs would 404 on redirect-back
    if (req.method === 'GET') {
      req.session.returnTo = req.originalUrl;
    }
    req.flash('error', 'Please login to continue');
    return res.redirect('/auth/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }
  next();
};

const requireOrg = (req, res, next) => {
  if (!req.session.orgId) {
    req.session.returnOrgTo = req.originalUrl;
    return res.redirect('/org/login');
  }
  next();
};

const requireOrgPlan = async (req, res, next) => {
  if (!req.session.orgId) {
    req.session.returnOrgTo = req.originalUrl;
    return res.redirect('/org/login');
  }
  try {
    const org = req.org || await Organization.findById(req.session.orgId).lean();
    const sub = org && org.subscription;
    const isActive = sub && sub.status === 'active' && sub.endDate && new Date(sub.endDate) > new Date();
    if (!isActive) {
      req.flash('error', 'You need an active plan to use this feature.');
      return res.redirect('/org/plans');
    }
    next();
  } catch (e) {
    return res.redirect('/org/plans');
  }
};

const loadUser = async (req, res, next) => {
  if (req.session.userId) {
    try {
      req.user = await User.findById(req.session.userId);
      if (req.user && req.user.isActive === false) {
        req.session.userId = null;
        req.user = null;
      }
      res.locals.user = req.user;
    } catch (e) {
      req.session.userId = null;
    }
  }
  if (req.session.orgId) {
    try {
      req.org = await Organization.findById(req.session.orgId).lean();
      res.locals.org = req.org;
    } catch (e) {
      req.session.orgId = null;
    }
  }
  next();
};

module.exports = { requireAuth, requireAdmin, requireOrg, requireOrgPlan, loadUser };

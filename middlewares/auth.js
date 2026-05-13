const User = require('../models/User');
const { Organization } = require('../models/Organization');

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    req.session.returnTo = req.originalUrl;
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

const loadUser = async (req, res, next) => {
  if (req.session.userId) {
    try {
      req.user = await User.findById(req.session.userId);
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

module.exports = { requireAuth, requireAdmin, requireOrg, loadUser };

const ContactMessage = require('../models/ContactMessage');

exports.company = (req, res) => {
  res.render('company', {
    title: `MockOrbit — India's Leading Mock Test Platform for Competitive Exams`,
    metaDesc: 'MockOrbit delivers full-length mock tests for Judiciary, CLAT, SSC CGL, Banking PO & 20+ exams. Real-time rank analytics, AI weak-area reports, and 150+ institute partnerships.',
    metaKeywords: 'mock test platform India, competitive exam preparation, judiciary mock test, CLAT mock test, SSC CGL preparation, banking PO mock test, online test series',
    user: req.user || null
  });
};

exports.about = (req, res) => {
  res.render('about', {
    title: `About MockOrbit — Helping India's Exam Aspirants Prepare Smarter`,
    metaDesc: 'Learn about MockOrbit — our mission to democratise competitive exam preparation in India, our story, values, and the team behind 50,000+ students\' success.',
    metaKeywords: 'about MockOrbit, exam preparation platform India, mock test company, CLAT SSC judiciary preparation',
    user: req.user || null
  });
};

exports.contact = (req, res) => {
  res.render('contact', {
    title: `Contact MockOrbit — Support, Partnerships & Queries`,
    metaDesc: 'Get in touch with MockOrbit for account support, test access issues, payment queries, or institution partnership enquiries. We respond within 24 hours.',
    metaKeywords: 'contact MockOrbit, MockOrbit support, mock test help, competitive exam support India',
    user: req.user || null
  });
};

exports.submitContact = async (req, res) => {
  try {
    const { name, email, topic, message, botcheck } = req.body || {};

    // Honeypot filled in: pretend success so bots don't retry
    if (botcheck) return res.json({ success: true });

    const clean = v => (typeof v === 'string' ? v.trim() : '');
    const data = { name: clean(name), email: clean(email), topic: clean(topic), message: clean(message) };

    if (!data.name || !data.email || !data.topic || !data.message) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields before submitting.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    await ContactMessage.create({
      ...data,
      userId: req.user ? req.user._id : null,
      ip: (req.get('x-forwarded-for') || '').split(',')[0].trim() || req.ip,
      userAgent: (req.get('user-agent') || '').slice(0, 300),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Contact form save error:', err.message);
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ success: false, message: 'Could not save your message.' });
  }
};

exports.privacy = (req, res) => {
  res.render('privacy', {
    title: `Privacy Policy — MockOrbit`,
    metaDesc: 'Read MockOrbit\'s privacy policy. Understand how we collect, use, and protect your personal information on India\'s leading mock test platform.',
    metaKeywords: 'MockOrbit privacy policy, data protection, student data security',
    user: req.user || null
  });
};

exports.terms = (req, res) => {
  res.render('terms', {
    title: `Terms of Service — MockOrbit`,
    metaDesc: 'Review MockOrbit\'s terms of service governing use of our mock test platform, account responsibilities, intellectual property, and payment terms.',
    metaKeywords: 'MockOrbit terms of service, terms and conditions, mock test platform terms',
    user: req.user || null
  });
};

exports.refund = (req, res) => {
  res.render('refund', {
    title: `Refund Policy — MockOrbit`,
    metaDesc: 'Read MockOrbit\'s refund policy for paid test series purchases. Learn what\'s eligible, how to request a refund, and our 5–7 day processing timeline.',
    metaKeywords: 'MockOrbit refund policy, mock test refund, test series cancellation',
    user: req.user || null
  });
};

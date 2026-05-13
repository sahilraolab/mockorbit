exports.company = (req, res) => {
  res.render('company', {
    title: `${process.env.APP_NAME} — Company`,
    metaDesc: 'Learn about MockOrbit, our mission, values, and how we support exam aspirants across India.',
    user: req.user || null
  });
};

exports.about = (req, res) => {
  res.render('about', {
    title: `${process.env.APP_NAME} — About Us`,
    metaDesc: 'Discover MockOrbit, our story, exam coverage, and the support we provide to help aspirants achieve their goals.',
    user: req.user || null
  });
};

exports.contact = (req, res) => {
  res.render('contact', {
    title: `${process.env.APP_NAME} — Contact Us`,
    metaDesc: 'Get in touch with MockOrbit for support, partnerships, or questions about mock tests and study resources.',
    user: req.user || null
  });
};

exports.privacy = (req, res) => {
  res.render('privacy', {
    title: `${process.env.APP_NAME} — Privacy Policy`,
    metaDesc: 'Read MockOrbit’s privacy policy to understand how we collect, use, and protect your data.',
    user: req.user || null
  });
};

exports.terms = (req, res) => {
  res.render('terms', {
    title: `${process.env.APP_NAME} — Terms of Service`,
    metaDesc: 'Review the terms of service that govern your use of MockOrbit’s platform and mock test services.',
    user: req.user || null
  });
};

exports.refund = (req, res) => {
  res.render('refund', {
    title: `${process.env.APP_NAME} — Refund Policy`,
    metaDesc: 'Read MockOrbit’s refund policy for paid access and test series purchases.',
    user: req.user || null
  });
};
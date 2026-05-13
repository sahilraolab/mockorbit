const express = require('express');
const router = express.Router();
const { Exam } = require('../models/Exam');

const homeController = require('../controllers/homeController');
const staticController = require('../controllers/staticController');

router.get('/', homeController.home);
router.get('/company', staticController.company);
router.get('/about', staticController.about);
router.get('/contact', staticController.contact);
router.get('/privacy', staticController.privacy);
router.get('/terms', staticController.terms);
router.get('/refund', staticController.refund);

// Dynamic sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const exams = await Exam.find({}).lean();

    const staticUrls = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/company', priority: '0.6', changefreq: 'monthly' },
      { loc: '/about', priority: '0.6', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
      { loc: '/privacy', priority: '0.5', changefreq: 'monthly' },
      { loc: '/terms', priority: '0.5', changefreq: 'monthly' },
      { loc: '/refund', priority: '0.5', changefreq: 'monthly' },
      { loc: '/org/register', priority: '0.8', changefreq: 'monthly' },
      { loc: '/auth/login', priority: '0.7', changefreq: 'monthly' }
    ];

    const examUrls = exams.map(e => ({
      loc: `/series/exam/${e.slug}`,
      priority: '0.9',
      changefreq: 'weekly'
    }));

    const allUrls = [...staticUrls, ...examUrls];
    const now = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${appUrl}${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;

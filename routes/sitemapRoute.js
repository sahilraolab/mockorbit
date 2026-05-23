const express = require('express');
const router = express.Router();
let Exam;
try { Exam = require('../models/Exam'); } catch (e) { Exam = null; }

// Dynamic XML sitemap
router.get('/sitemap.xml', async (req, res) => {
  const appUrl = process.env.APP_URL || 'https://mockorbit.in';
  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { url: '/',         changefreq: 'weekly',  priority: '1.0' },
    { url: '/about',    changefreq: 'monthly', priority: '0.8' },
    { url: '/company',  changefreq: 'monthly', priority: '0.8' },
    { url: '/contact',  changefreq: 'monthly', priority: '0.7' },
    { url: '/privacy',  changefreq: 'yearly',  priority: '0.4' },
    { url: '/terms',    changefreq: 'yearly',  priority: '0.4' },
    { url: '/refund',   changefreq: 'yearly',  priority: '0.4' },
    { url: '/auth/login', changefreq: 'yearly', priority: '0.5' },
    { url: '/org/login',  changefreq: 'yearly', priority: '0.5' },
    { url: '/org/register', changefreq: 'yearly', priority: '0.6' },
  ];

  // Dynamic exam/series pages
  let dynamicEntries = '';
  try {
    if (Exam) {
      // Exam model has top-level isActive and nested series[].isActive
      const exams = await Exam.find({ isActive: true }).select('slug updatedAt').lean();
      exams.forEach(e => {
        const lastmod = e.updatedAt ? new Date(e.updatedAt).toISOString().split('T')[0] : today;
        dynamicEntries += `
  <url>
    <loc>${appUrl}/series/exam/${encodeURIComponent(e.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
      });
    }
  } catch (e) {
    // DB not yet connected or model unavailable — serve static-only sitemap
  }

  const staticEntries = staticPages.map(p => `
  <url>
    <loc>${appUrl}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticEntries}${dynamicEntries}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.header('Cache-Control', 'public, max-age=86400'); // cache 24h
  res.send(xml);
});

module.exports = router;

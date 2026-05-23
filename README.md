# MockOrbit — Production Deployment Guide

**Mission for Academic Rank & Success** — India's focused mock test platform for competitive exam aspirants.

---

## Quick Start (Local Dev)

```bash
# 1. Clone and install
git clone <your-repo>
cd mockorbit
npm install

# 2. Create .env from example
cp .env.example .env
# Fill in MONGO_URI, SESSION_SECRET, RAZORPAY_*, GA_MEASUREMENT_ID

# 3. (Optional) Seed the database
npm run seed

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

See `.env.example` for the full list. **Critical before going live:**

| Variable | Notes |
|---|---|
| `NODE_ENV` | Set to `production` |
| `APP_URL` | Your live domain e.g. `https://mockorbit.in` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | Minimum 64 random characters |
| `RAZORPAY_KEY_ID` | Use `rzp_live_` key for production |
| `RAZORPAY_WEBHOOK_SECRET` | Set in Razorpay dashboard |
| `GA_MEASUREMENT_ID` | Google Analytics 4 Measurement ID |

---

## Production Deploy (Render / Railway / DigitalOcean)

### Render (recommended free tier)

1. Push code to GitHub
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all env vars from `.env.example` in Render dashboard
6. Set **Node version** to `18` in environment settings

### DigitalOcean App Platform / VPS

```bash
# On server
git pull origin main
npm install --production
pm2 restart mockorbit
```

Use **Nginx** as reverse proxy:
```nginx
server {
    listen 80;
    server_name mockorbit.in www.mockorbit.in;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name mockorbit.in;
    ssl_certificate /etc/letsencrypt/live/mockorbit.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mockorbit.in/privkey.pem;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Post-Deploy SEO Checklist

- [ ] Submit `https://mockorbit.in/sitemap.xml` to [Google Search Console](https://search.google.com/search-console)
- [ ] Verify site ownership in Search Console
- [ ] Set up GA4 property and confirm data is flowing
- [ ] Confirm `robots.txt` is accessible at `/robots.txt`
- [ ] Test Open Graph tags with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Test structured data with [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Verify HTTPS redirect is working
- [ ] Check mobile rendering with Google's Mobile-Friendly Test

---

## New Dependencies Added

```bash
npm install helmet compression
```

- **helmet** — Sets security HTTP headers (CSP, HSTS, etc.)
- **compression** — Gzip compression for all responses (~70% bandwidth saving)

---

## Folder Structure

```
mockorbit/
├── app.js              ← Express app (security, compression, routes)
├── server.js           ← DB connect + listen
├── .env.example        ← Environment variable template
├── routes/
│   ├── routes.js       ← All feature routers
│   ├── index.js        ← Home + static pages
│   └── sitemapRoute.js ← Dynamic /sitemap.xml
├── controllers/
│   └── staticController.js ← SEO meta for each static page
├── views/
│   ├── partials/
│   │   ├── header.ejs  ← Logo, nav, SEO meta, GA, JSON-LD
│   │   └── footer.ejs  ← Footer links, schema
│   ├── about.ejs
│   ├── contact.ejs
│   ├── privacy.ejs
│   ├── terms.ejs
│   ├── refund.ejs
│   └── company.ejs
└── public/
    ├── css/style.css   ← Responsive styles + mobile nav + static pages
    ├── js/app.js       ← Mobile menu JS + existing test interface
    ├── favicon.ico
    ├── robots.txt
    └── site.webmanifest
```

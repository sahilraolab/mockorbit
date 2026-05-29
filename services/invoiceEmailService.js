/**
 * Invoice Email Service — MockOrbit
 * Sends a payment confirmation / invoice email to the user via Resend.
 *
 * .env required:
 *   RESEND_API_KEY=re_xxxxxxxx
 *   EMAIL_FROM=MockOrbit <hello@mockorbit.com>
 *   APP_URL=https://mockorbit.com
 *   APP_NAME=MockOrbit
 */

const https = require('https');

/**
 * Send an invoice / payment confirmation email.
 *
 * @param {object} opts
 * @param {string} opts.toEmail       - recipient email
 * @param {string} opts.toName        - recipient name (optional)
 * @param {string} opts.seriesTitle   - purchased series title
 * @param {number} opts.amount        - amount paid (INR); 0 for free access
 * @param {string} opts.paymentId     - Razorpay payment ID or "free"
 * @param {string} opts.orderId       - Razorpay order ID or "free"
 */
module.exports.sendInvoiceEmail = async function (opts = {}) {
  const { toEmail, toName = '', seriesTitle = 'Mock Test Series', amount = 0, paymentId = '', orderId = '' } = opts;

  const apiKey  = process.env.RESEND_API_KEY;
  const from    = process.env.EMAIL_FROM || 'MockOrbit <hello@mockorbit.com>';
  const appName = process.env.APP_NAME   || 'MockOrbit';
  const appUrl  = process.env.APP_URL    || 'https://mockorbit.com';

  const dateStr   = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const isFree    = amount === 0;
  const greetName = toName ? `, ${toName.split(' ')[0]}` : '';

  // GST breakdown — 18% included in price
  // baseAmount = total / 1.18, gstAmount = total - baseAmount
  const baseAmount = isFree ? 0 : Math.round((amount / 1.18) * 100) / 100;
  const gstAmount  = isFree ? 0 : Math.round((amount - baseAmount) * 100) / 100;

  const fmt = n => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amountStr = isFree ? 'Free Access' : `₹${fmt(amount)}`;

  if (!apiKey) {
    console.log('\n══════════════════════════════════════');
    console.log('📧  MOCK INVOICE EMAIL (no RESEND_API_KEY set)');
    console.log(`    To     : ${toEmail}`);
    console.log(`    Series : ${seriesTitle}`);
    console.log(`    Amount : ${amountStr}`);
    console.log('══════════════════════════════════════\n');
    return { success: true };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${isFree ? 'Access Confirmed' : 'Payment Confirmed'} — ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:48px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(28,43,58,0.10);">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);padding:32px 40px;text-align:center;">
      <div style="margin-bottom:8px;">
        <span style="font-family:Georgia,serif;font-size:1.6rem;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Mock</span><span style="font-family:Georgia,serif;font-size:1.6rem;font-weight:700;color:#60a5fa;letter-spacing:-0.02em;">Orbit</span>
      </div>
      <div style="font-size:0.72rem;color:rgba(255,255,255,0.45);letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Mission for Academic Rank &amp; Success</div>
    </td>
  </tr>
  <tr><td style="background:linear-gradient(90deg,#16a34a,#22c55e);height:3px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Body -->
  <tr>
    <td style="padding:40px 40px 32px;">
      <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.1em;">${isFree ? '✓ Access Granted' : '✓ Payment Confirmed'}</p>
      <h2 style="margin:0 0 14px;font-size:1.4rem;color:#0f172a;font-weight:800;line-height:1.2;">You're all set${greetName}!</h2>
      <p style="margin:0 0 28px;font-size:0.95rem;color:#6b7280;line-height:1.7;">${isFree ? 'Your free access to' : 'Your purchase of'} <strong style="color:#0f172a;">${seriesTitle}</strong> is confirmed. Head to your dashboard to start your mock tests.</p>

      <!-- Summary box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border:1px solid #e0e7ff;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 14px;font-size:0.78rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;">Order Summary</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:0.88rem;color:#6b7280;padding:6px 0;">Description</td>
              <td style="font-size:0.88rem;color:#0f172a;font-weight:600;text-align:right;">${seriesTitle}</td>
            </tr>
            <tr>
              <td style="font-size:0.88rem;color:#6b7280;padding:6px 0;">Date</td>
              <td style="font-size:0.88rem;color:#0f172a;font-weight:600;text-align:right;">${dateStr}</td>
            </tr>
            ${!isFree ? `
            <tr><td colspan="2" style="padding:8px 0 4px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
            <tr>
              <td style="font-size:0.85rem;color:#6b7280;padding:5px 0;">Subtotal (excl. GST)</td>
              <td style="font-size:0.85rem;color:#374151;text-align:right;">₹${fmt(baseAmount)}</td>
            </tr>
            <tr>
              <td style="font-size:0.85rem;color:#6b7280;padding:5px 0;">GST (CGST + SGST) @ 18%</td>
              <td style="font-size:0.85rem;color:#374151;text-align:right;">₹${fmt(gstAmount)}</td>
            </tr>
            <tr><td colspan="2" style="padding:4px 0 8px;"><div style="border-top:2px solid #e0e7ff;"></div></td></tr>
            <tr>
              <td style="font-size:0.95rem;color:#0f172a;font-weight:800;padding:4px 0;">Total Paid</td>
              <td style="font-size:0.95rem;color:#2563eb;font-weight:800;text-align:right;">${amountStr}</td>
            </tr>
            <tr>
              <td colspan="2" style="font-size:0.72rem;color:#9ca3af;padding:6px 0 0;font-style:italic;">
                Prices are inclusive of 18% GST (CGST + SGST). This document serves as a receipt of payment.
              </td>
            </tr>
            ` : `
            <tr>
              <td style="font-size:0.88rem;color:#6b7280;padding:6px 0;">Amount</td>
              <td style="font-size:0.88rem;color:#16a34a;font-weight:700;text-align:right;">Free Access</td>
            </tr>
            `}
            ${paymentId && !isFree ? `
            <tr><td colspan="2" style="padding:8px 0 4px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
            <tr>
              <td style="font-size:0.75rem;color:#9ca3af;padding:4px 0;">Payment ID</td>
              <td style="font-size:0.75rem;color:#6b7280;text-align:right;">${paymentId}</td>
            </tr>
            ` : ''}
          </table>
        </td></tr>
      </table>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:0.95rem;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.01em;">Go to My Dashboard →</a>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
  <tr>
    <td style="padding:24px 40px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:0.8rem;color:#2563eb;font-weight:700;">${appName}</p>
      <p style="margin:0;font-size:0.75rem;color:#9ca3af;line-height:1.6;">
        Mock tests · All-India rank · Topic analytics<br>
        <a href="${appUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">${appUrl}</a> · <a href="${appUrl}/contact" style="color:#6b7280;text-decoration:none;">Support</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const subject = isFree
    ? `Access confirmed — ${seriesTitle}`
    : `Payment confirmed — ${seriesTitle} (₹${amount.toLocaleString('en-IN')})`;

  const text = [
    `${isFree ? 'Access Confirmed' : 'Payment Confirmed'} — ${appName}`,
    ``,
    `You're all set${greetName}!`,
    ``,
    `Description : ${seriesTitle}`,
    `Date        : ${dateStr}`,
    ...(!isFree ? [
      ``,
      `Subtotal (excl. GST)     : ₹${fmt(baseAmount)}`,
      `GST (CGST + SGST) @ 18%                : ₹${fmt(gstAmount)}`,
      `Total Paid               : ${amountStr}`,
      ``,
      `Prices are inclusive of 18% GST (IGST).`,
    ] : [`Amount      : Free Access`]),
    ...(paymentId && !isFree ? [`Payment ID  : ${paymentId}`] : []),
    ``,
    `Dashboard: ${appUrl}/dashboard`,
    `${appName} — ${appUrl}`,
  ].join('\n');

  const payload = JSON.stringify({ from, to: [toEmail], subject, html, text });

  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error('Resend invoice error: ' + body));
        else resolve();
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  return { success: true };
};

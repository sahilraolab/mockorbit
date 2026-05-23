/**
 * Email OTP Service — MockOrbit
 * Provider: Resend (https://resend.com)
 *
 * .env:
 *   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
 *   EMAIL_FROM=MockOrbit <otp@mockorbit.in>
 *
 * If RESEND_API_KEY is not set, OTP is logged to console (dev mode).
 */

const https = require('https');

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

module.exports.generateOTP = generateOTP;

module.exports.sendEmailOTP = async (email, otp) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log('\n══════════════════════════════════════');
    console.log('📧  MOCK EMAIL OTP (no RESEND_API_KEY set)');
    console.log(`    To  : ${email}`);
    console.log(`    OTP : ${otp}`);
    console.log('══════════════════════════════════════\n');
    return { success: true };
  }

  const from    = process.env.EMAIL_FROM || 'MockOrbit <otp@mockorbit.in>';
  const appName = process.env.APP_NAME   || 'MockOrbit';
  const appUrl  = process.env.APP_URL    || 'https://mockorbit.in';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your ${appName} OTP</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(28,43,58,0.10);" class="email-wrapper">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);padding:32px 40px;text-align:center;">
            <div style="margin-bottom:8px;">
              <span style="font-family:Georgia,serif;font-size:1.6rem;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Mock</span><span style="font-family:Georgia,serif;font-size:1.6rem;font-weight:700;color:#60a5fa;letter-spacing:-0.02em;">Orbit</span>
            </div>
            <div style="font-size:0.72rem;color:rgba(255,255,255,0.45);letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Mission for Academic Rank &amp; Success</div>
          </td>
        </tr>

        <!-- Blue accent bar -->
        <tr><td style="background:linear-gradient(90deg,#2563eb,#3b82f6);height:3px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.1em;">Login Verification</p>
            <h2 style="margin:0 0 16px;font-size:1.4rem;color:#0f172a;font-weight:800;line-height:1.2;">Your one-time password</h2>
            <p style="margin:0 0 32px;font-size:0.95rem;color:#6b7280;line-height:1.7;">Enter this code to complete your login. The code expires in <strong style="color:#0f172a;">10 minutes</strong> and can only be used once.</p>

            <!-- OTP box -->
            <div style="text-align:center;margin:0 0 32px;">
              <div style="display:inline-block;background:#eff6ff;border:2px solid #bfdbfe;border-radius:14px;padding:22px 52px;">
                <span style="font-size:2.6rem;font-weight:900;letter-spacing:0.3em;color:#1e3a8a;font-family:'Courier New',monospace;">${otp}</span>
              </div>
              <p style="margin:12px 0 0;font-size:0.78rem;color:#9ca3af;">Valid for 10 minutes · Do not share</p>
            </div>

            <!-- Security note -->
            <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:10px;padding:14px 18px;">
              <p style="margin:0;font-size:0.82rem;color:#6b7280;line-height:1.6;">
                🔒 <strong style="color:#374151;">Security tip:</strong> MockOrbit will never ask for this code via phone or chat. If you didn't request this OTP, you can safely ignore this email.
              </p>
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:0.8rem;color:#2563eb;font-weight:700;">${appName}</p>
            <p style="margin:0;font-size:0.75rem;color:#9ca3af;line-height:1.6;">
              Mock tests · All-India rank · Topic analytics<br>
              <a href="${appUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">${appUrl}</a>
            </p>
          </td>
        </tr>

      </table>

      <!-- Below-card note -->
      <p style="margin:20px 0 0;font-size:0.72rem;color:#9ca3af;text-align:center;">
        This email was sent to you because a login was attempted on MockOrbit.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const payload = JSON.stringify({
    from,
    to: [email],
    subject: `${otp} is your ${appName} login OTP`,
    html,
    text: `Your ${appName} OTP is: ${otp}\n\nValid for 10 minutes. Do not share this code.\n\n${appName} — ${appUrl}`
  });

  const data = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error('Resend error: ' + (parsed.message || body)));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error('Resend: invalid JSON response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  return { success: true, messageId: data.id };
};

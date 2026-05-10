import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')!;
const PORTAL_URL      = Deno.env.get('PORTAL_URL') ?? 'http://localhost:3000';
const FROM_EMAIL      = 'SIPCOT TRACK <onboarding@resend.dev>';

function baseTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#003366;padding:24px 32px 0 32px;">
            <p style="margin:0;color:#FF9900;font-size:11px;font-weight:bold;letter-spacing:1.5px;">
              GOVERNMENT OF TAMIL NADU &nbsp;|&nbsp; SIPCOT TRACK PORTAL
            </p>
            <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;font-weight:800;">
              Welcome to SIPCOT TRACK
            </h1>
          </td>
        </tr>
        <tr><td style="background:#FF9900;height:4px;"></td></tr>
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <tr>
          <td style="background:#F4F6FB;padding:20px 32px;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
              This is a system-generated message from SIPCOT TRACK.<br/>
              <a href="${PORTAL_URL}" style="color:#003366;">Visit Portal</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeIndustry(name: string): string {
  const body = `
    <h2 style="color:#003366;">Welcome, ${name}!</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      Your account on the SIPCOT TRACK portal has been successfully created. You can now log in to submit your monthly industrial reports, track resource consumption, and manage your compliance data.
    </p>
    <div style="text-align:center;margin-top:28px;">
      <a href="${PORTAL_URL}/login"
         style="background:#003366;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block;">
        Log In to Portal
      </a>
    </div>
  `;
  return baseTemplate('Welcome to SIPCOT TRACK', body);
}

function welcomeOfficial(name: string): string {
  const body = `
    <h2 style="color:#003366;">Welcome, ${name}!</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      Thank you for registering as a SIPCOT Official. Your account is currently <strong>Pending Approval</strong> by the system administrator.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      You will receive another notification once your access has been verified and activated.
    </p>
  `;
  return baseTemplate('Registration Received - SIPCOT TRACK', body);
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { record } = await req.json();
    if (!record) return new Response('No record', { status: 400 });

    const { email, full_name, role } = record;
    const name = full_name || 'User';
    
    let subject = 'Welcome to SIPCOT TRACK';
    let html = '';

    if (role === 'official' || role === 'admin') {
      subject = 'Registration Received: SIPCOT TRACK Official Access';
      html = welcomeOfficial(name);
    } else {
      html = welcomeIndustry(name);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject,
        html,
      }),
    });

    const resBody = await res.json();
    return new Response(JSON.stringify({ success: true, id: resBody.id }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

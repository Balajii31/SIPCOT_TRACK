// ── Edge Function: notify-status-change ──────────────────────────────────────
// Triggered by Supabase Database Webhook on:
//   Table: monthly_reports
//   Event: UPDATE (when status column changes)
// Sends email to the allottee with approval/rejection details.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')!;
const PORTAL_URL      = Deno.env.get('PORTAL_URL') ?? 'https://sipcot-track.vercel.app';
const FROM_EMAIL      = 'SIPCOT TRACK <onboarding@resend.dev>';

// ── Supabase admin client (service role — needed to read users table) ─────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
);

// ── HTML Email Templates ──────────────────────────────────────────────────────
function baseTemplate(title: string, bodyHtml: string, refId: string): string {
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

        <!-- HEADER BAND -->
        <tr>
          <td style="background:#003366;padding:24px 32px 0 32px;">
            <p style="margin:0;color:#FF9900;font-size:11px;font-weight:bold;letter-spacing:1.5px;">
              GOVERNMENT OF TAMIL NADU &nbsp;|&nbsp; SIPCOT TRACK PORTAL
            </p>
            <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;font-weight:800;">
              SIPCOT Allottee Compliance System
            </h1>
          </td>
        </tr>
        <tr>
          <td style="background:#FF9900;height:4px;"></td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#F4F6FB;padding:20px 32px;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
              This is a system-generated message from SIPCOT TRACK.<br/>
              Reference: <strong>${refId}</strong> &nbsp;|&nbsp;
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

function verifiedTemplate(name: string, refId: string, period: string): string {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#D1FAE5;border-radius:50%;padding:16px;">
        <span style="font-size:32px;">&#10003;</span>
      </div>
    </div>
    <h2 style="color:#003366;text-align:center;margin:0 0 8px;">Compliance Approved</h2>
    <p style="color:#64748B;text-align:center;margin:0 0 28px;font-size:14px;">
      Your monthly performance report has been reviewed and verified.
    </p>

    <table width="100%" cellpadding="12" style="background:#F8FAFF;border-radius:8px;border:1px solid #E0E9FF;margin-bottom:24px;">
      <tr>
        <td style="color:#64748B;font-size:13px;border-bottom:1px solid #E0E9FF;"><strong>Industry</strong></td>
        <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #E0E9FF;">${name}</td>
      </tr>
      <tr>
        <td style="color:#64748B;font-size:13px;border-bottom:1px solid #E0E9FF;"><strong>Reporting Period</strong></td>
        <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #E0E9FF;">${period}</td>
      </tr>
      <tr>
        <td style="color:#64748B;font-size:13px;"><strong>Reference ID</strong></td>
        <td style="color:#003366;font-size:13px;font-weight:bold;">${refId}</td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;line-height:1.7;">
      Your submission is now marked as <strong style="color:#059669;">VERIFIED</strong> in the SIPCOT TRACK system.
      This acknowledgement serves as official confirmation of your monthly compliance filing.
    </p>

    <div style="text-align:center;margin-top:28px;">
      <a href="${PORTAL_URL}/allottee/update"
         style="background:#003366;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block;">
        View My Reports
      </a>
    </div>`;
  return baseTemplate('Compliance Approved - SIPCOT TRACK', body, refId);
}

function rejectedTemplate(name: string, refId: string, period: string, reason?: string): string {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#FEE2E2;border-radius:50%;padding:16px;">
        <span style="font-size:32px;color:#DC2626;">&#9888;</span>
      </div>
    </div>
    <h2 style="color:#DC2626;text-align:center;margin:0 0 8px;">Action Required: Correction Needed</h2>
    <p style="color:#64748B;text-align:center;margin:0 0 28px;font-size:14px;">
      Your monthly report has been reviewed and requires corrections before it can be approved.
    </p>

    <table width="100%" cellpadding="12" style="background:#FFF8F8;border-radius:8px;border:1px solid #FECACA;margin-bottom:24px;">
      <tr>
        <td style="color:#64748B;font-size:13px;border-bottom:1px solid #FECACA;"><strong>Industry</strong></td>
        <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #FECACA;">${name}</td>
      </tr>
      <tr>
        <td style="color:#64748B;font-size:13px;border-bottom:1px solid #FECACA;"><strong>Reporting Period</strong></td>
        <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #FECACA;">${period}</td>
      </tr>
      <tr>
        <td style="color:#64748B;font-size:13px;border-bottom:1px solid #FECACA;"><strong>Reference ID</strong></td>
        <td style="color:#DC2626;font-size:13px;font-weight:bold;border-bottom:1px solid #FECACA;">${refId}</td>
      </tr>
      ${reason ? `<tr>
        <td style="color:#64748B;font-size:13px;"><strong>Reason</strong></td>
        <td style="color:#DC2626;font-size:13px;">${reason}</td>
      </tr>` : ''}
    </table>

    <p style="color:#475569;font-size:14px;line-height:1.7;">
      Please log into the SIPCOT TRACK portal, review the flagged data points, and re-submit
      your performance report. Contact your district SIPCOT office if you need assistance.
    </p>

    <div style="text-align:center;margin-top:28px;">
      <a href="${PORTAL_URL}/allottee/update"
         style="background:#DC2626;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block;">
        Re-Submit Report
      </a>
    </div>`;
  return baseTemplate('Action Required - SIPCOT TRACK', body, refId);
}

function pendingTemplate(name: string, refId: string, period: string): string {
  const body = `
    <h2 style="color:#003366;margin:0 0 8px;">Submission Received</h2>
    <p style="color:#64748B;margin:0 0 24px;font-size:14px;">
      Your monthly compliance report has been successfully submitted and is currently under review.
    </p>

    <table width="100%" cellpadding="12" style="background:#F8FAFF;border-radius:8px;border:1px solid #E0E9FF;margin-bottom:24px;">
      <tr>
        <td style="color:#64748B;font-size:13px;border-bottom:1px solid #E0E9FF;"><strong>Industry</strong></td>
        <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #E0E9FF;">${name}</td>
      </tr>
      <tr>
        <td style="color:#64748B;font-size:13px;border-bottom:1px solid #E0E9FF;"><strong>Reporting Period</strong></td>
        <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #E0E9FF;">${period}</td>
      </tr>
      <tr>
        <td style="color:#64748B;font-size:13px;"><strong>Reference ID</strong></td>
        <td style="color:#003366;font-size:13px;font-weight:bold;">${refId}</td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;line-height:1.7;">
      A SIPCOT official will review your data shortly. You will receive another email once
      your report is <strong>Verified</strong> or if any corrections are required.
    </p>`;
  return baseTemplate('Submission Acknowledged - SIPCOT TRACK', body, refId);
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const payload = await req.json();
    // Supabase webhook sends { type, table, record, old_record, schema }
    const record     = payload.record;
    const oldRecord  = payload.old_record;

    if (!record) return new Response('No record in payload', { status: 400 });

    const { industry_id, status, month, year } = record;
    const oldStatus = oldRecord?.status;
    const refId     = `SIPCOT-${record.id?.toString(36).toUpperCase().slice(-8) ?? 'UNKNOWN'}`;
    const period    = `${String(month).padStart(2, '0')}/${year}`;

    // Skip if status hasn't changed
    if (status === oldStatus && payload.type === 'UPDATE') {
      return new Response(JSON.stringify({ skipped: true, reason: 'status unchanged' }), { status: 200 });
    }

    // ── Fetch industry info + linked user profile email ───────────────────────
    const { data: industry, error: indErr } = await supabase
      .from('industries')
      .select(`
        name,
        contact_email,
        user:profiles (email)
      `)
      .eq('id', industry_id)
      .single();

    if (indErr || !industry) {
      console.error('Industry fetch failed:', indErr);
      return new Response('Industry not found', { status: 404 });
    }

    // Use linked profile email as primary, fallback to contact_email
    const userEmail = (industry as any).user?.email;
    const toEmail   = userEmail || industry.contact_email;
    if (!toEmail) return new Response('No email address for industry', { status: 400 });

    const name = industry.name ?? 'Valued Allottee';

    // ── Pick template & subject ───────────────────────────────────────────────
    let subject = '';
    let html    = '';

    if (status === 'verified') {
      subject = `Compliance Approved: SIPCOT Monthly Filing [Ref: ${refId}]`;
      html    = verifiedTemplate(name, refId, period);
    } else if (status === 'rejected') {
      subject = `Action Required: Correction Needed for SIPCOT Filing [Ref: ${refId}]`;
      html    = rejectedTemplate(name, refId, period, record.rejection_reason);
    } else if (status === 'pending') {
      subject = `Acknowledgement: SIPCOT Monthly Filing [Ref: ${refId}]`;
      html    = pendingTemplate(name, refId, period);
    } else {
      return new Response(JSON.stringify({ skipped: true, status }), { status: 200 });
    }

    // ── Send via Resend ───────────────────────────────────────────────────────
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [toEmail],
        subject,
        html,
      }),
    });

    const resBody = await res.json();
    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(resBody)}`);

    console.log(`Email sent to ${toEmail} | status: ${status} | ref: ${refId}`);
    return new Response(JSON.stringify({ success: true, id: resBody.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('notify-status-change error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

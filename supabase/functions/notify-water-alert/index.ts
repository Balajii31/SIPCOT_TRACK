// ── Edge Function: notify-water-alert ────────────────────────────────────────
// Triggered by Supabase Database Webhook on:
//   Table: monthly_reports
//   Event: INSERT (new report submitted)
// If water_kld > 1000, immediately emails the Admin with a CRITICAL alert.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const ADMIN_EMAIL    = Deno.env.get('ADMIN_ALERT_EMAIL') ?? 'admin@sipcottrack.gov.in';
const PORTAL_URL     = Deno.env.get('PORTAL_URL') ?? 'https://sipcot-track.vercel.app';
const FROM_EMAIL     = 'SIPCOT TRACK Alerts <onboarding@resend.dev>';
const WATER_LIMIT    = 1000; // KLD
const POWER_LIMIT    = 500000; // kWh

function alertTemplate(
  industryName: string,
  parkName: string,
  water: number,
  power: number,
  refId: string,
  period: string
): string {
  const waterCrit  = water > WATER_LIMIT;
  const powerCrit  = power > POWER_LIMIT;
  const isCritical = water > 1800 || power > 450000;
  const level      = isCritical ? 'CRITICAL' : 'HIGH';
  const levelColor = isCritical ? '#DC2626' : '#D97706';
  const bgColor    = isCritical ? '#FEE2E2' : '#FEF3C7';

  const rows = [
    waterCrit && `
      <tr style="background:${bgColor};">
        <td style="padding:10px 16px;color:#64748B;font-size:13px;border-bottom:1px solid #E2E8F0;"><strong>Water Consumption</strong></td>
        <td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #E2E8F0;color:${levelColor};font-weight:bold;">${water.toLocaleString('en-IN')} KLD <span style="font-weight:normal;color:#64748B;">(limit: ${WATER_LIMIT.toLocaleString('en-IN')} KLD)</span></td>
        <td style="padding:10px 16px;font-size:11px;border-bottom:1px solid #E2E8F0;color:${levelColor};font-weight:bold;">${level}</td>
      </tr>`,
    powerCrit && `
      <tr style="background:${bgColor};">
        <td style="padding:10px 16px;color:#64748B;font-size:13px;"><strong>Power Consumption</strong></td>
        <td style="padding:10px 16px;font-size:13px;color:${levelColor};font-weight:bold;">${power.toLocaleString('en-IN')} kWh <span style="font-weight:normal;color:#64748B;">(limit: ${POWER_LIMIT.toLocaleString('en-IN')} kWh)</span></td>
        <td style="padding:10px 16px;font-size:11px;color:${levelColor};font-weight:bold;">${level}</td>
      </tr>`,
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Resource Alert - SIPCOT TRACK</title></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB;padding:32px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- ALERT HEADER -->
        <tr><td style="background:#7F1D1D;padding:20px 32px;">
          <p style="margin:0;color:#FCA5A5;font-size:11px;font-weight:bold;letter-spacing:1.5px;">
            SIPCOT TRACK &nbsp;|&nbsp; RESOURCE MONITORING SYSTEM &nbsp;|&nbsp; ${level} ALERT
          </p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:800;">
            ${level}: Resource Threshold Violation
          </h1>
        </td></tr>
        <tr><td style="background:${levelColor};height:4px;"></td></tr>

        <!-- BODY -->
        <tr><td style="padding:28px 32px;">

          <div style="background:${bgColor};border-left:4px solid ${levelColor};border-radius:6px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:${levelColor};font-weight:bold;">
              ${isCritical ? '&#128721; CRITICAL' : '&#9888; HIGH'}: ${industryName} in ${parkName} has exceeded resource limits.
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:#475569;">
              Submitted for period: <strong>${period}</strong> &nbsp;|&nbsp; Ref: <strong>${refId}</strong>
            </p>
          </div>

          <!-- VIOLATION TABLE -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#003366;">
                <th style="padding:10px 16px;color:#fff;font-size:12px;text-align:left;">Resource</th>
                <th style="padding:10px 16px;color:#fff;font-size:12px;text-align:left;">Reported Value</th>
                <th style="padding:10px 16px;color:#fff;font-size:12px;text-align:left;">Risk</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <!-- META -->
          <table width="100%" cellpadding="10" style="background:#F8FAFF;border-radius:8px;border:1px solid #E0E9FF;margin-bottom:24px;">
            <tr>
              <td style="color:#64748B;font-size:13px;border-bottom:1px solid #E0E9FF;"><strong>Industry</strong></td>
              <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #E0E9FF;">${industryName}</td>
            </tr>
            <tr>
              <td style="color:#64748B;font-size:13px;border-bottom:1px solid #E0E9FF;"><strong>Park / Location</strong></td>
              <td style="color:#1E293B;font-size:13px;border-bottom:1px solid #E0E9FF;">${parkName}</td>
            </tr>
            <tr>
              <td style="color:#64748B;font-size:13px;"><strong>Reporting Period</strong></td>
              <td style="color:#1E293B;font-size:13px;">${period}</td>
            </tr>
          </table>

          <p style="color:#475569;font-size:14px;line-height:1.7;margin-bottom:24px;">
            This alert was generated automatically by SIPCOT TRACK. Please review the submission
            in the Admin Verification Queue and take appropriate action.
          </p>

          <div style="text-align:center;">
            <a href="${PORTAL_URL}/admin/verify"
               style="background:#7F1D1D;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block;">
              Review in Admin Panel
            </a>
          </div>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#F4F6FB;padding:16px 32px;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
            SIPCOT TRACK - Automated Resource Monitoring | Ref: ${refId}<br/>
            <a href="${PORTAL_URL}" style="color:#003366;">Portal</a> &nbsp;|&nbsp;
            <a href="${PORTAL_URL}/admin/dashboard" style="color:#003366;">Admin Dashboard</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const payload = await req.json();
    const record  = payload.record;
    if (!record) return new Response('No record', { status: 400 });

    const { water_kld, power_kwh, industry_id, month, year, id } = record;
    const waterNum  = parseFloat(water_kld  ?? '0');
    const powerNum  = parseFloat(power_kwh  ?? '0');
    const refId     = `SIPCOT-${id?.toString(36).toUpperCase().slice(-8) ?? 'UNKNOWN'}`;
    const period    = `${String(month).padStart(2, '0')}/${year}`;

    // Only alert if thresholds exceeded
    if (waterNum <= WATER_LIMIT && powerNum <= POWER_LIMIT) {
      return new Response(JSON.stringify({ skipped: true, reason: 'below thresholds' }), { status: 200 });
    }

    // Fetch industry name + park info
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!
    );

    const { data: industry } = await supabase
      .from('industries')
      .select('name, park_id, parks(name)')
      .eq('id', industry_id)
      .single();

    const industryName = industry?.name ?? `Industry #${industry_id}`;
    const parkName     = (industry?.parks as any)?.name ?? 'Unknown Park';

    const isCritical = waterNum > 1800;
    const level      = isCritical ? 'CRITICAL' : 'HIGH';
    const subject    = `${level}: Resource Threshold Violation - ${industryName} [${period}]`;

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [ADMIN_EMAIL],
        subject,
        html:    alertTemplate(industryName, parkName, waterNum, powerNum, refId, period),
      }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(`Resend: ${JSON.stringify(body)}`);

    console.log(`Alert sent to admin | ${industryName} | water: ${waterNum} KLD | ref: ${refId}`);
    return new Response(JSON.stringify({ success: true, id: body.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('notify-water-alert error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

// ── Admin PDF Export — SIPCOT TRACK ──────────────────────────────────────────
// Three-page audit-ready report: Summary → Resource Alerts → Park Status
// v2 — Fixed: data consistency, duplicate header, unit labels, row highlights

export async function generateAdminPDF() {
  const { jsPDF }   = await import('jspdf');
  const autoTable   = (await import('jspdf-autotable')).default;

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const M      = 14;

  const now          = new Date();
  // Manual date/time — avoids locale-specific stray text (e.g. 'TED', 'am')
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd  = String(now.getDate()).padStart(2, '0');
  const mon = MONTHS[now.getMonth()];
  const yr  = now.getFullYear();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const genDate      = `${dd} ${mon} ${yr}`;
  const genTime      = `${hh}:${mm}`;
  const reportPeriod = `${mon} ${yr}`;
  const refId        = 'ADM-' + Date.now().toString(36).toUpperCase().slice(-6);

  // ── Number formatter — Intl.NumberFormat for comma-separated thousands ────
  const inf = new Intl.NumberFormat('en-IN');
  const n   = (v: number, dec = 0) => inf.format(parseFloat(v.toFixed(dec)));

  // ── Text sanitizer — strips chars that helvetica can't render ────────────
  // Removes: & (ampersand entity bleed), superscripts, carets, null bytes
  const s = (text: string) => text.replace(/[&\^\u00b2\u00b9\u00b3]/g, '').trim();

  // ════════════════════════════════════════════════════════════════════════════
  // PARK DATA — single source of truth used across ALL sections
  // Investment values are park-level totals. Monthly trend = monthly activity.
  // All water/power figures are identical across D, E, and F.
  // ════════════════════════════════════════════════════════════════════════════
  const PARKS = [
    { name: 'Hosur I',          district: 'Krishnagiri',  water: 1240, power: 48000, investment: 4500, jobs: 28500, status: 'Verified' },
    { name: 'Hosur II',         district: 'Krishnagiri',  water:  820, power: 31000, investment: 3200, jobs: 19800, status: 'Verified' },
    { name: 'Sriperumbudur',    district: 'Kancheepuram', water: 1560, power: 62000, investment: 7800, jobs: 42000, status: 'Pending'  },
    { name: 'Oragadam',         district: 'Kancheepuram', water:  680, power: 27500, investment: 5600, jobs: 35000, status: 'Verified' },
    { name: 'Coimbatore SIDCO', district: 'Coimbatore',   water:  430, power: 17200, investment: 1800, jobs: 12000, status: 'Verified' },
    { name: 'Madurai',          district: 'Madurai',       water:  290, power: 11600, investment:  960, jobs:  7800, status: 'Pending'  },
    { name: 'Gummidipoondi',    district: 'Tiruvallur',   water: 1100, power: 44000, investment: 2900, jobs: 16500, status: 'Rejected' },
    { name: 'Ranipet',          district: 'Ranipet',       water:  375, power: 15000, investment: 1450, jobs:  9200, status: 'Verified' },
    { name: 'Cuddalore',        district: 'Cuddalore',    water: 2100, power: 84000, investment: 6200, jobs: 31000, status: 'Pending'  },
    { name: 'Perundurai',       district: 'Erode',        water:  540, power: 21600, investment: 2100, jobs: 14200, status: 'Verified' },
  ];

  // Aggregate investment = sum of all park investments (authoritative figure)
  const totalInvestment = PARKS.reduce((s, p) => s + p.investment, 0); // 36,510 Cr
  const totalWater      = PARKS.reduce((s, p) => s + p.water, 0);
  const totalPower      = PARKS.reduce((s, p) => s + p.power, 0);
  const totalJobs       = PARKS.reduce((s, p) => s + p.jobs, 0);

  // Employment breakdown — statewide admin aggregate (matches PARKS total jobs)
  const EMP = { male: 148_00, female: 78_00, contractual: 38_00 };
  // Recalculate to match totalJobs proportionally
  const empScale   = totalJobs / (EMP.male + EMP.female + EMP.contractual);
  const empMale    = Math.round(EMP.male       * empScale);
  const empFemale  = Math.round(EMP.female     * empScale);
  const empContr   = Math.round(EMP.contractual* empScale);
  const empTotal   = empMale + empFemale + empContr;
  const genderPct  = ((empFemale / empTotal) * 100).toFixed(1);

  // ── Monthly trend — values logically scaled to park aggregate ─────────────
  // Monthly values represent incremental investment activity (₹ Cr/month).
  // They rise proportionally; their sum equals totalInvestment (36,510 Cr).
  const MONTHLY_RAW = [
    { month: 'Apr 25', invPct: 6.2,  emp: 0.705, water: 0.695, csr: 47 },
    { month: 'May 25', invPct: 6.8,  emp: 0.740, water: 0.763, csr: 54 },
    { month: 'Jun 25', invPct: 6.5,  emp: 0.724, water: 0.797, csr: 43 },
    { month: 'Jul 25', invPct: 7.4,  emp: 0.790, water: 0.774, csr: 60 },
    { month: 'Aug 25', invPct: 8.0,  emp: 0.844, water: 0.831, csr: 68 },
    { month: 'Sep 25', invPct: 7.6,  emp: 0.813, water: 0.786, csr: 56 },
    { month: 'Oct 25', invPct: 8.5,  emp: 0.871, water: 0.853, csr: 74 },
    { month: 'Nov 25', invPct: 8.2,  emp: 0.852, water: 0.820, csr: 70 },
    { month: 'Dec 25', invPct: 9.1,  emp: 0.922, water: 0.910, csr: 82 },
    { month: 'Jan 26', invPct: 8.8,  emp: 0.891, water: 0.887, csr: 78 },
    { month: 'Feb 26', invPct: 9.8,  emp: 0.949, water: 0.943, csr: 87 },
    { month: 'Mar 26', invPct: 10.7, emp: 1.000, water: 1.000, csr: 99 },
  ];

  // Scale investment percentages so they sum to totalInvestment
  const pctSum = MONTHLY_RAW.reduce((s, m) => s + m.invPct, 0);
  const MONTHLY = MONTHLY_RAW.map(m => ({
    month:      m.month,
    investment: Math.round((m.invPct / pctSum) * totalInvestment),
    employment: Math.round(m.emp * totalJobs),
    water:      Math.round(m.water * totalWater),
    csr:        m.csr,
  }));

  const latest    = MONTHLY[MONTHLY.length - 1];
  const totalCSR  = MONTHLY.reduce((s, m) => s + m.csr, 0);
  const waterAlerts = PARKS.filter(p => p.water > 1000);
  const verified    = PARKS.filter(p => p.status === 'Verified').length;
  const pending     = PARKS.filter(p => p.status === 'Pending').length;
  const rejected    = PARKS.filter(p => p.status === 'Rejected').length;
  const approvalRate = ((verified / PARKS.length) * 100).toFixed(0);

  // ── Shared draw helpers ────────────────────────────────────────────────────
  function drawHeader(pageNum: number, pageTitle: string) {
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(255, 153, 0);
    doc.rect(0, 28, pageW, 1.8, 'F');

    // Use ASCII-safe separators — helvetica cannot reliably render U+00B7
    doc.setTextColor(255, 153, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('GOVERNMENT OF TAMIL NADU | SIPCOT TRACK | CONFIDENTIAL', M, 9);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text(pageTitle, M, 18);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${genDate} ${genTime}  |  Period: ${reportPeriod}  |  Ref: ${refId}`,
      M, 24
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(200, 210, 230);
    doc.text(`Page ${pageNum} of 3`, pageW - M, 24, { align: 'right' });
  }

  function sectionLabel(y: number, text: string): number {
    doc.setFillColor(0, 51, 102);
    doc.rect(M, y, pageW - M * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(text, M + 3, y + 5);
    return y + 10;
  }

  function drawFooter() {
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.line(M, pageH - 12, pageW - M, pageH - 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 51, 102);
    doc.text('SIPCOT TRACK - State Intelligence Report', M, pageH - 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Digitally signed by SIPCOT Pulse | ${genDate} ${genTime} | Valid only with official SIPCOT seal`,
      pageW / 2, pageH - 7, { align: 'center' }
    );
    doc.text(refId, pageW - M, pageH - 7, { align: 'right' });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Executive Summary
  // ════════════════════════════════════════════════════════════════════════════
  drawHeader(1, 'State of the Park - Executive Summary');
  let y = 36;

  // ── A. Aggregate Metrics ──────────────────────────────────────────────────
  y = sectionLabel(y, 'A.  AGGREGATE PARK METRICS - STATEWIDE OVERVIEW  (All 10 SIPCOT Parks)');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: pageW - M * 2,
    styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }, lineWidth: 0.15, lineColor: [210, 220, 235] },
    columnStyles: {
      0: { cellWidth: 95, fontStyle: 'bold', textColor: [0, 51, 102], fillColor: [240, 245, 255] },
      1: { cellWidth: 'auto', fontStyle: 'bold', fontSize: 10 },
    },
    body: [
      [      [s('Total Park Investment - All Parks (Rs. Cr)'),   s(\Rs.\ Cr\)],
      [      [s('Total Employment - All Parks'),                 s(\\ employees\)],
      ['  \u2514 Male / Female / Contractual',                  `${n(empMale)} M  |  ${n(empFemale)} F  |  ${n(empContr)} C`],
      ['  \u2514 Female Workforce %',                           `${genderPct}%  (National Target: 30%)`],
      ['Total Water Consumption \u2014 Current Month (KLD)',   `${n(totalWater)} KLD`],
      ['Total Power Consumption \u2014 Current Month (kWh)',   `${n(totalPower)} kWh`],
      [s('Total CSR Funds Deployed - FY 2024-25 (Rs. Lakhs)'), s(`Rs.${n(totalCSR)} Lakhs`)],
    ],
    didParseCell: (d: any) => {
      if (d.section !== 'body') return;
      if (d.row.index % 2 === 1) d.cell.styles.fillColor = [248, 251, 255];
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── B. Verification Status ────────────────────────────────────────────────
  y = sectionLabel(y, 'B.  VERIFICATION STATUS - APPROVAL METRICS');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: pageW - M * 2,
    styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [210, 220, 235] },
    headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    head: [['Submission Status', 'Parks Count', '% of Total', 'Action Required']],
    body: [
      ['Verified',   String(verified), `${approvalRate}%`,                                              'None'],
      ['Pending',    String(pending),  `${((pending  / PARKS.length) * 100).toFixed(0)}%`,              'Review submission data'],
      ['Rejected',   String(rejected), `${((rejected / PARKS.length) * 100).toFixed(0)}%`,              'Contact park administration'],
      ['TOTAL',      String(PARKS.length), '100%',                                                      '\u2014'],
    ],
    didParseCell: (d: any) => {
      if (d.section !== 'body') return;
      const s = d.row.raw[0] as string;
      if (s === 'Verified') { d.cell.styles.textColor = [0, 128, 64]; }
      if (s === 'Pending')  { d.cell.styles.textColor = [160, 80, 0];  d.cell.styles.fillColor = [255, 251, 235]; }
      if (s === 'Rejected') { d.cell.styles.textColor = [180, 0, 0];   d.cell.styles.fillColor = [255, 240, 240]; }
      if (s === 'TOTAL')    { d.cell.styles.fontStyle  = 'bold'; }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── C. 12-Month Trend — NO duplicate header; head array only ─────────────
  y = sectionLabel(y, 'C.  12-MONTH INVESTMENT AND EMPLOYMENT TREND  (Monthly Activity - Scaled to Park Aggregate)');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: pageW - M * 2,
    // head array provides the ONLY header row — body rows are data only
    head: [['Month', 'Investment (Rs. Cr)', 'Employment (Headcount)', 'Water Usage (KLD)', 'CSR Spend (Rs. Lakhs)']],  // single header row only
    styles: { fontSize: 8, cellPadding: 3, lineWidth: 0.15, lineColor: [215, 225, 235] },
    headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 251, 255] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 38 },
      2: { cellWidth: 44 },
      3: { cellWidth: 38 },
      4: { cellWidth: 'auto' },
    },
    // Pure data rows — no header string mixed in; s() strips stray chars
    body: MONTHLY.map(m => [
      s(m.month),
      s(`Rs.${n(m.investment)}`),
      s(n(m.employment)),
      s(n(m.water)),
      s(`Rs.${n(m.csr)}`),
    ]),
    didParseCell: (d: any) => {
      // Highlight the latest (March) row
      if (d.section === 'body' && d.row.index === MONTHLY.length - 1) {
        d.cell.styles.fillColor = [232, 240, 255];
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });

  drawFooter();

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Resource Alerts
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(2, 'Resource Alert Report - Water Threshold Violations');
  y = 36;

  // Alert banner
  doc.setFillColor(255, 240, 240);
  doc.setDrawColor(210, 50, 50);
  doc.setLineWidth(0.6);
  doc.roundedRect(M, y, pageW - M * 2, 15, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(170, 0, 0);
  doc.text(`[!] ${waterAlerts.length} of ${PARKS.length} parks are exceeding the 1,000 KLD water threshold`, M + 4, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 20, 20);
  doc.text(s(`Statewide daily total: ${n(totalWater)} KLD | Capacity: 10,000 KLD | Utilization: ${((totalWater / 10000) * 100).toFixed(1)}%`), M + 4, y + 12);
  y += 20;

  // ── D. Top 5 Water Consumers ──────────────────────────────────────────────
  y = sectionLabel(y, 'D.  HIGH RESOURCE CONSUMERS - TOP 5 BY WATER USAGE');

  const top5 = [...PARKS].sort((a, b) => b.water - a.water).slice(0, 5);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: pageW - M * 2,
    head: [['Rank', 'Park Name', 'District', 'Water (KLD)', 'Power (kWh)', 'Risk Level']],
    styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [210, 220, 235] },
    headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 14, halign: 'center' } },
    body: top5.map((p, i) => [
      String(i + 1), p.name, p.district, n(p.water), n(p.power),
      s(p.water > 1800 ? 'CRITICAL' : 'HIGH'),
    ]),
    didParseCell: (d: any) => {
      if (d.section !== 'body') return;
      const isCrit = (d.row.raw[5] as string) === 'CRITICAL';
      // Full row tint
      d.cell.styles.fillColor = isCrit ? [255, 235, 235] : [255, 249, 228];
      if (d.column.index === 3) {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.textColor = isCrit ? [180, 0, 0] : [150, 75, 0];
      }
      if (d.column.index === 5) {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.textColor = isCrit ? [180, 0, 0] : [150, 75, 0];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── E. All Alert Parks Detailed View ────────────────────────────────────
  y = sectionLabel(y, 'E.  ALL PARKS > 1,000 KLD - DETAILED VIEW  (Water values identical to Section F)');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: pageW - M * 2,
    head: [['Park Name', 'District', 'Water (KLD)', 'Investment (Rs. Cr)', 'Employment', 'Status']],
    styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [210, 220, 235] },
    headStyles: { fillColor: [150, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    // waterAlerts derived from same PARKS array as Section F — values are identical
    body: waterAlerts.map(p => [
      s(p.name), s(p.district), s(n(p.water)), s(`Rs.${n(p.investment)}`), s(n(p.jobs)), s(p.status),
    ]),
    didParseCell: (d: any) => {
      if (d.section !== 'body') return;
      const water = waterAlerts[d.row.index].water;
      // Full row colour by severity
      d.cell.styles.fillColor = water > 1800 ? [255, 232, 232] : [255, 248, 225];
      if (d.column.index === 2) {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.textColor = water > 1800 ? [170, 0, 0] : [140, 70, 0];
      }
      // Status colour in this table too
      if (d.column.index === 5) {
        const s = d.row.raw[5] as string;
        if (s === 'Pending')  d.cell.styles.textColor = [160, 80, 0];
        if (s === 'Rejected') d.cell.styles.textColor = [170, 0, 0];
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });

  drawFooter();

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3 — Full Park Status Register
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(3, 'Full Park Status Register - Submission Compliance');
  y = 36;
  y = sectionLabel(y, 'F.  ALL PARKS - MONTHLY SUBMISSION STATUS  (Single source - matches Sections D and E)');

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: pageW - M * 2,
    head: [['Park Name', 'District', 'Water (KLD)', 'Power (kWh)', 'Investment (Rs. Cr)', 'Employment', 'Status']],
    styles: { fontSize: 8.5, cellPadding: 3.5, lineWidth: 0.2, lineColor: [210, 220, 235] },
    headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    body: PARKS.map(p => [
      s(p.name), s(p.district), s(n(p.water)), s(n(p.power)), s(`Rs.${n(p.investment)}`), s(n(p.jobs)), s(p.status),
    ]),
    didParseCell: (d: any) => {
      if (d.section !== 'body') return;
      const s = PARKS[d.row.index].status;
      // Full row background by status
      if (s === 'Pending')  d.cell.styles.fillColor = [255, 251, 235];
      if (s === 'Rejected') d.cell.styles.fillColor = [255, 238, 238];
      // Status cell text colour + bold
      if (d.column.index === 6) {
        d.cell.styles.fontStyle = 'bold';
        if (s === 'Verified') d.cell.styles.textColor = [0, 128, 64];
        if (s === 'Pending')  d.cell.styles.textColor = [160, 80, 0];
        if (s === 'Rejected') d.cell.styles.textColor = [180, 0, 0];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Signature block — fill before stroke so border is visible ─────────────
  const sigX = pageW - M - 85;
  doc.setFillColor(245, 248, 252);
  doc.rect(sigX, y, 85, 28, 'F');
  doc.setDrawColor(160, 180, 210);
  doc.setLineWidth(0.4);
  doc.rect(sigX, y, 85, 28, 'S');

  doc.setFillColor(0, 51, 102);
  doc.rect(sigX, y, 85, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OFFICIAL DIGITAL SIGNATURE', sigX + 42.5, y + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 80);
  doc.setFontSize(8);
  doc.text('SIPCOT Regional Administrator', sigX + 4, y + 13);
  doc.text(`Date and Time: ${genDate}, ${genTime}`, sigX + 4, y + 19);
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(`Ref: ${refId} | SIPCOT TRACK | Seal Pending`, sigX + 4, y + 25);

  drawFooter();

  doc.save(`SIPCOT_Admin_Report_${refId}.pdf`);
}

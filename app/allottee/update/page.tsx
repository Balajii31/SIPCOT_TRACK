'use client';

// Force dynamic rendering — prevents Vercel build prerender crash
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { supabase, type Industry } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface FormData {
  // Step 1
  investment_cr: string;
  turnover_cr: string;
  // Step 2
  emp_male: string;
  emp_female: string;
  emp_contractual: string;
  // Step 3
  water_kld: string;
  power_kwh: string;
  // Step 4
  csr_spend_lakhs: string;
  csr_activity: string;
  csr_file: File | null;
}

const STEPS = [
  { id: 1, label: 'Investment' },
  { id: 2, label: 'Employment' },
  { id: 3, label: 'Utilities' },
  { id: 4, label: 'CSR' },
];

const EMPTY_FORM: FormData = {
  investment_cr: '',
  turnover_cr: '',
  emp_male: '',
  emp_female: '',
  emp_contractual: '',
  water_kld: '',
  power_kwh: '',
  csr_spend_lakhs: '',
  csr_activity: '',
  csr_file: null,
};

export default function AllotteeUpdatePage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Industries from DB (demo mode: list all industries)
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>('');
  const [selectedIndustryName, setSelectedIndustryName] = useState<string>('');
  const [industriesLoading, setIndustriesLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const set = (key: keyof FormData, value: string | File | null) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Load industries from Supabase
  useEffect(() => {
    async function loadIndustries() {
      try {
        const { data, error } = await supabase
          .from('industries')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setIndustries(data ?? []);
        if (data && data.length > 0) {
          setSelectedIndustryId(data[0].id);
          setSelectedIndustryName(data[0].name);
        }
      } catch (err: any) {
        toast.error('Could not load industries: ' + err.message);
      } finally {
        setIndustriesLoading(false);
      }
    }
    loadIndustries();
  }, []);

  const validateStep = (): boolean => {
    if (step === 1 && (!form.investment_cr || !form.turnover_cr)) {
      toast.error('Please fill in both Investment and Turnover.'); return false;
    }
    if (step === 2 && (!form.emp_male || !form.emp_female || !form.emp_contractual)) {
      toast.error('Please fill all employment fields.'); return false;
    }
    if (step === 3 && (!form.water_kld || !form.power_kwh)) {
      toast.error('Please fill both Water and Power fields.'); return false;
    }
    if (step === 4 && (!form.csr_spend_lakhs || !form.csr_activity)) {
      toast.error('Please fill CSR Spend and Activity description.'); return false;
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 4)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (!selectedIndustryId) { toast.error('Please select an industry.'); return; }

    setSubmitting(true);
    const loadingToast = toast.loading('Submitting report…');

    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      // Upload CSR file if present
      let csr_file_url: string | null = null;
      if (form.csr_file) {
        const ext = form.csr_file.name.split('.').pop();
        const path = `${selectedIndustryId}/${year}-${month}-csr.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('csr-documents')
          .upload(path, form.csr_file, { upsert: true });
        if (uploadError) throw new Error('File upload failed: ' + uploadError.message);
        const { data: urlData } = supabase.storage.from('csr-documents').getPublicUrl(path);
        csr_file_url = urlData.publicUrl;
      }

      // Upsert the monthly report
      const { error } = await supabase
        .from('monthly_reports')
        .upsert(
          {
            industry_id:     selectedIndustryId,
            month,
            year,
            investment_cr:   parseFloat(form.investment_cr),
            turnover_cr:     parseFloat(form.turnover_cr),
            emp_male:        parseInt(form.emp_male),
            emp_female:      parseInt(form.emp_female),
            emp_contractual: parseInt(form.emp_contractual),
            water_kld:       parseFloat(form.water_kld),
            power_kwh:       parseFloat(form.power_kwh),
            csr_spend_lakhs: parseFloat(form.csr_spend_lakhs),
            csr_activity:    form.csr_activity,
            csr_file_url,
            status:          'pending',
            submitted_at:    new Date().toISOString(),
          },
          { onConflict: 'industry_id,month,year' }
        );

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success('Report submitted! Pending verification.');
      setSubmitted(true);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setSubmitted(false); setStep(1); setForm(EMPTY_FORM); };

  // ── PDF Generator ──────────────────────────────────────────────────────────
  const generatePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable  = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const refId = 'SIPCOT-' + Date.now().toString(36).toUpperCase().slice(-8);
    const submissionDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const reportMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    // Safe number formatter — avoids jsPDF character-spacing bugs from locale strings
    const fmt = (n: string, decimals = 2) => {
      const num = parseFloat(n || '0');
      return isNaN(num) ? '0' : num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    const fmtInt = (n: string) => {
      const num = parseInt(n || '0', 10);
      return isNaN(num) ? '0' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const empMale         = fmtInt(form.emp_male);
    const empFemale       = fmtInt(form.emp_female);
    const empContractual  = fmtInt(form.emp_contractual);
    const empTotal        = fmtInt(
      String(parseInt(form.emp_male || '0') + parseInt(form.emp_female || '0') + parseInt(form.emp_contractual || '0'))
    );

    const workforce =
      (form.emp_male || form.emp_female || form.emp_contractual)
        ? `${empMale} Male | ${empFemale} Female | ${empContractual} Contractual`
        : '—';

    const investmentVal  = form.investment_cr    ? `₹${fmt(form.investment_cr)} Cr`          : '—';
    const turnoverVal    = form.turnover_cr      ? `₹${fmt(form.turnover_cr)} Cr`            : '—';
    const waterVal       = form.water_kld        ? `${fmt(form.water_kld)} KLD`               : '—';
    const powerVal       = form.power_kwh        ? `${fmt(form.power_kwh)} kWh`               : '—';
    const csrVal         = form.csr_spend_lakhs  ? `₹${fmt(form.csr_spend_lakhs)} Lakhs`     : '—';
    const csrActivity    = (form.csr_activity || '').trim() || '—';

    const attachmentList = form.csr_file ? form.csr_file.name : 'No supporting document uploaded.';


    // ── Header band ───────────────────────────────────────────────────────────
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pageW, 35, 'F');

    // Amber accent stripe
    doc.setFillColor(255, 153, 0);
    doc.rect(0, 35, pageW, 2, 'F');

    // Emblem circle
    doc.setFillColor(255, 255, 255);
    doc.circle(pageW - 24, 17, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('SIPCOT', pageW - 24, 15.5, { align: 'center' });
    doc.text('EMBLEM', pageW - 24, 19, { align: 'center' });

    // Header text
    doc.setTextColor(255, 153, 0);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNMENT OF TAMIL NADU  \u00b7  SIPCOT TRACK PORTAL', margin, 10);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('SIPCOT Allottee Compliance Receipt', margin, 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Tamil Nadu Industrial Development & Promotion Corporation', margin, 27);
    doc.text('Monthly Performance Filing \u2014 Acknowledgement Copy', margin, 32);

    // ── Bold blue title bar ───────────────────────────────────────────────────
    let y = 44;
    doc.setFillColor(232, 240, 254);
    doc.rect(margin, y, pageW - margin * 2, 9, 'F');
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, pageW - margin * 2, 9, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.text('OFFICIAL SUBMISSION ACKNOWLEDGEMENT', pageW / 2, y + 6.2, { align: 'center' });

    y += 14;

    // ── SECTION A: Industry Identification ───────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text('SECTION A \u2014 INDUSTRY IDENTIFICATION', margin, y);
    doc.setDrawColor(255, 153, 0);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
      styles: { fontSize: 9, cellPadding: 3.5, lineWidth: 0.2, lineColor: [210, 218, 230] },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [0, 51, 102], cellWidth: 55, fillColor: [240, 245, 255] },
        1: { cellWidth: 'auto' },
      },
      body: [
        ['Reference ID', refId],
        ['Allottee / Industry', selectedIndustryName || 'N/A'],
        ['Reporting Period', reportMonth],
        ['Submission Date', submissionDate],
        ['Filing Status', 'PENDING VERIFICATION'],
      ],
      didParseCell: (data: any) => {
        if (data.row.index === 4 && data.column.index === 1) {
          data.cell.styles.fillColor = [255, 245, 220];
          data.cell.styles.textColor = [180, 80, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── SECTION B: Performance Metrics ────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text('SECTION B \u2014 SELF-REPORTED PERFORMANCE METRICS', margin, y);
    doc.setDrawColor(255, 153, 0);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 5;

    // Section B rows — category is listed per-row; didDrawCell blanks repeats
    // to simulate rowSpan visually.
    const sectionBRows: [string, string, string][] = [
      ['ECONOMIC',            'Total Investment',   investmentVal],
      ['ECONOMIC',            'Annual Turnover',    turnoverVal],
      ['HUMAN RESOURCES',     'Total Workforce',    empTotal ? `${empTotal} employees` : '\u2014'],
      ['HUMAN RESOURCES',     'Workforce Breakdown', workforce],
      ['ENVIRONMENTAL',       'Water Consumption',  waterVal],
      ['ENVIRONMENTAL',       'Power Consumption',  powerVal],
      ['ENVIRONMENTAL / CSR', 'CSR Expenditure',    csrVal],
      ['ENVIRONMENTAL / CSR', 'CSR Activity',       csrActivity],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
      head: [['Category', 'Metric', 'Value']],
      styles: {
        fontSize: 9,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        lineWidth: 0.2,
        lineColor: [210, 218, 230],
        font: 'helvetica',
        overflow: 'linebreak',
      },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      // No alternateRowStyles — we control colours entirely via didParseCell
      alternateRowStyles: {},
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [0, 51, 102], cellWidth: 46, valign: 'middle' },
        1: { cellWidth: 66, textColor: [40, 40, 40] },
        2: { cellWidth: 'auto', fontStyle: 'bold', textColor: [20, 20, 20] },
      },
      body: sectionBRows,
      didParseCell: (data: any) => {
        if (data.section === 'head') return;
        const rowIdx = data.row.index;
        const cat = (sectionBRows[rowIdx]?.[0] ?? '') as string;
        const col = data.column.index;

        // Category column background by group
        if (col === 0) {
          if (cat === 'ECONOMIC')             data.cell.styles.fillColor = [235, 245, 255];
          else if (cat === 'HUMAN RESOURCES') data.cell.styles.fillColor = [235, 252, 243];
          else                                data.cell.styles.fillColor = [245, 240, 255];
        } else {
          // Metric + Value: slightly tinted row background per group
          if (cat === 'ECONOMIC')             data.cell.styles.fillColor = [248, 251, 255];
          else if (cat === 'HUMAN RESOURCES') data.cell.styles.fillColor = [248, 253, 250];
          else                                data.cell.styles.fillColor = [250, 248, 255];
        }

        // Water alert
        if (rowIdx === 4 && col === 2 && parseFloat(form.water_kld || '0') > 1000) {
          data.cell.styles.textColor = [180, 50, 0];
          data.cell.styles.fontStyle = 'bold';
        }

        // Blank repeated category label to simulate rowSpan
        if (col === 0 && rowIdx > 0) {
          const prevCat = (sectionBRows[rowIdx - 1]?.[0] ?? '') as string;
          if (prevCat === cat) {
            data.cell.text = [''];    // hide repeated label
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── SECTION C: Attachment Manifest ────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text('SECTION C \u2014 ATTACHMENT MANIFEST', margin, y);
    doc.setDrawColor(255, 153, 0);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
      styles: { fontSize: 9, cellPadding: 3.5, lineWidth: 0.2, lineColor: [210, 218, 230] },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [0, 51, 102], fillColor: [240, 245, 255], cellWidth: 55 },
        1: { cellWidth: 'auto' },
      },
      body: [
        ['Supporting Document', attachmentList],
        ['CSR Activity Description', form.csr_activity || 'Not provided'],
        ['Upload Status', form.csr_file ? 'Document attached and uploaded.' : 'No document uploaded.'],
      ],
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Footer notice box ─────────────────────────────────────────────────────
    if (y + 24 > pageH - 20) y = pageH - 48;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(200, 212, 228);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text('Important Notice', margin + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text('This is a system-generated acknowledgement of your monthly compliance filing.', margin + 4, y + 13);
    doc.text('Valid only with official SIPCOT digital seal. For verification, contact your district SIPCOT office.', margin + 4, y + 19);

    // ── Page footer ──────────────────────────────────────────────────────────
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 51, 102);
    doc.text('SIPCOT TRACK', margin, pageH - 9);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Ref: ${refId}  \u00b7  Generated: ${submissionDate}`, pageW / 2, pageH - 9, { align: 'center' });
    doc.text('Page 1 of 1', pageW - margin, pageH - 9, { align: 'right' });

    // ── Diagonal watermark ────────────────────────────────────────────────────
    doc.setTextColor(215, 225, 242);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(50);
    doc.text('SYSTEM GENERATED', pageW / 2, pageH / 2, { align: 'center', angle: 45 });

    doc.save(`SIPCOT_Compliance_Receipt_${refId}.pdf`);
    toast.success('PDF downloaded successfully!');
  };

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#003366] mb-3">Report Submitted!</h2>
          <p className="text-gray-500 mb-6">
            Your monthly data report has been submitted and is pending verification by SIPCOT officials.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-8 py-3 bg-[#FF9900] text-white rounded-lg font-bold text-sm hover:bg-[#e68a00] active:scale-95 transition-all shadow-lg shadow-[#FF9900]/30 w-full justify-center"
            >
              <Download className="w-4 h-4" />
              Download My Report
            </button>
            <div className="flex gap-3 w-full">
              <button onClick={reset} className="flex-1 px-6 py-2.5 border-2 border-[#003366] text-[#003366] rounded-lg font-semibold hover:bg-[#003366] hover:text-white transition-colors">
                Submit Another
              </button>
              <Link href="/" className="flex-1 text-center px-6 py-2.5 bg-[#003366] text-white rounded-lg font-semibold hover:bg-[#004d99] transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BrandHeader
        subtitle="Industry Data Submission"
        rightContent={
          <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Industry Selector */}
        <div className="bg-[#FF9900]/10 border border-[#FF9900]/40 rounded-xl px-5 py-3 mb-8 flex items-center gap-3 flex-wrap">
          <span className="text-[#FF9900] font-bold text-sm">DEMO MODE</span>
          <span className="text-gray-600 text-sm">Reporting for:</span>
          {industriesLoading ? (
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          ) : industries.length === 0 ? (
            <span className="text-red-600 text-sm font-semibold">
              No industries in database. Add records to the <code>industries</code> table first.
            </span>
          ) : (
            <select
              value={selectedIndustryId}
              onChange={e => {
                setSelectedIndustryId(e.target.value);
                const ind = industries.find(i => i.id === e.target.value);
                setSelectedIndustryName(ind?.name ?? '');
              }}
              className="text-sm font-semibold text-[#003366] border border-[#003366]/30 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
            >
              {industries.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#003366] mb-1">Monthly Data Report</h1>
          <p className="text-gray-500">
            Submit your performance metrics for{' '}
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  step > s.id ? 'bg-[#003366] border-[#003366] text-white'
                  : step === s.id ? 'bg-[#FF9900] border-[#FF9900] text-white shadow-lg scale-110'
                  : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > s.id ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.id}
                </div>
                <span className={`text-xs mt-2 font-semibold ${step === s.id ? 'text-[#FF9900]' : step > s.id ? 'text-[#003366]' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors duration-300 ${step > s.id ? 'bg-[#003366]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">

          {/* Step 1: Investment */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#003366] mb-1">Investment & Turnover</h2>
                <p className="text-gray-500 text-sm">Enter your financial performance data in Crore Rupees (₹ Cr).</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'investment_cr' as const, label: 'Total Investment', unit: 'Cr' },
                  { key: 'turnover_cr' as const, label: 'Annual Turnover', unit: 'Cr' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {f.label} <span className="text-gray-400 font-normal">(₹ Crore)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={form[f.key]}
                        onChange={e => set(f.key, e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Employment */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#003366] mb-1">Employment Data</h2>
                <p className="text-gray-500 text-sm">Enter headcount by category.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'emp_male' as const, label: 'Male Employees' },
                  { key: 'emp_female' as const, label: 'Female Employees' },
                  { key: 'emp_contractual' as const, label: 'Contractual Workers' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}</label>
                    <input
                      type="number" min="0"
                      value={form[f.key]}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm"
                    />
                  </div>
                ))}
              </div>
              {form.emp_male && form.emp_female && form.emp_contractual && (
                <div className="bg-[#003366]/5 border border-[#003366]/20 rounded-xl p-4">
                  <p className="text-sm text-[#003366] font-semibold">
                    Total Headcount:{' '}
                    <span className="text-lg font-extrabold">
                      {(parseInt(form.emp_male || '0') + parseInt(form.emp_female || '0') + parseInt(form.emp_contractual || '0')).toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Utilities */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#003366] mb-1">Utilities Consumption</h2>
                <p className="text-gray-500 text-sm">Water &gt; 1,000 KLD will trigger an alert on the admin map.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Water Usage <span className="text-gray-400 font-normal">(KLD)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0" step="0.01"
                      value={form.water_kld}
                      onChange={e => set('water_kld', e.target.value)}
                      placeholder="0.00"
                      className={`w-full px-4 pr-16 py-3 border-2 rounded-xl focus:outline-none transition-colors text-sm ${
                        parseFloat(form.water_kld || '0') > 1000
                          ? 'border-[#FF9900] focus:border-[#FF9900] bg-[#FF9900]/5'
                          : 'border-gray-200 focus:border-[#003366]'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">KLD</span>
                  </div>
                  {parseFloat(form.water_kld || '0') > 1000 && (
                    <p className="text-[#FF9900] text-xs font-semibold mt-2">⚠ Alert: Usage exceeds 1,000 KLD threshold</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Power Consumption <span className="text-gray-400 font-normal">(kWh)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0" step="0.01"
                      value={form.power_kwh}
                      onChange={e => set('power_kwh', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">kWh</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: CSR */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#003366] mb-1">CSR Activities</h2>
                <p className="text-gray-500 text-sm">Report your Corporate Social Responsibility initiatives.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CSR Spend <span className="text-gray-400 font-normal">(₹ Lakhs)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.csr_spend_lakhs}
                    onChange={e => set('csr_spend_lakhs', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-20 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Lakhs</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">CSR Activity Description</label>
                <textarea
                  value={form.csr_activity}
                  onChange={e => set('csr_activity', e.target.value)}
                  placeholder="Describe the CSR activities undertaken this month…"
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Supporting Document <span className="text-gray-400 font-normal">(Photo or PDF — optional)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#003366] hover:bg-[#003366]/5 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => set('csr_file', e.target.files?.[0] ?? null)}
                  />
                  {form.csr_file ? (
                    <div className="text-[#003366]">
                      <p className="font-semibold">📎 {form.csr_file.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{(form.csr_file.size / 1024).toFixed(1)} KB — Click to change</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-500">Click to upload a photo or PDF</p>
                      <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100">
            <button
              onClick={back}
              disabled={step === 1}
              className="px-6 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:border-[#003366] hover:text-[#003366] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              {STEPS.map(s => (
                <div key={s.id} className={`h-2 rounded-full transition-all ${step === s.id ? 'bg-[#FF9900] w-6' : step > s.id ? 'bg-[#003366] w-2' : 'bg-gray-200 w-2'}`} />
              ))}
            </div>
            {step < 4 ? (
              <button
                onClick={next}
                className="px-8 py-2.5 bg-[#003366] text-white rounded-xl font-semibold text-sm hover:bg-[#004d99] transition-colors"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedIndustryId}
                className="px-8 py-2.5 bg-[#FF9900] text-white rounded-xl font-bold text-sm hover:bg-[#e68a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting…</>
                ) : '✓ Submit Report'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

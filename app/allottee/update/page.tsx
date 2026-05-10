'use client';

// Force dynamic rendering — prevents Vercel build prerender crash
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { supabase, type Industry } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { UserNav } from '@/components/UserNav';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [userIndustry, setUserIndustry] = useState<{ id: string; name: string } | null>(null);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState('');

  const set = (key: keyof FormData, value: string | File | null) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Load current user's industry
  useEffect(() => {
    async function loadUserIndustry() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Session expired. Please login again.');
          return;
        }

        // Check industries table for matching user_id
        const { data, error } = await supabase
          .from('industries')
          .select('id, name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUserIndustry(data);
        } else {
          // If no linked industry, fetch the list so they can link it
          const { data: all } = await supabase
            .from('industries')
            .select('*')
            .order('name');
          if (all) setAllIndustries(all);
          toast.error('No industry linked to your account.', { id: 'link-error' });
        }
      } catch (err: any) {
        toast.error('Error identifying industry: ' + err.message);
      } finally {
        setAuthLoading(false);
      }
    }
    loadUserIndustry();
  }, []);

  const handleLinkIndustry = async (industryId: string) => {
    setLinking(true);
    const loadingToast = toast.loading('Linking account to industry...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired');

      const linked = allIndustries.find(i => i.id === industryId);
      if (linked) {
        // Update industry record
        const { error: indError } = await supabase
          .from('industries')
          .update({ user_id: user.id })
          .eq('id', industryId);

        if (indError) throw indError;

        // Update profile record for consistency
        await supabase
          .from('profiles')
          .update({ 
            industry_name: linked.name, 
            allottee_code: linked.allottee_code 
          })
          .eq('id', user.id);

        setUserIndustry({ id: linked.id, name: linked.name });
      }
      
      toast.dismiss(loadingToast);
      toast.success('Account linked successfully!');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to link account: ' + err.message);
    } finally {
      setLinking(false);
    }
  };

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
    if (!userIndustry) { toast.error('Account not authorized for submission.'); return; }

    setSubmitting(true);
    const loadingToast = toast.loading('Submitting report…');

    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      // Upload CSR file if present
      let csr_file_url: string | null = null;
      if (form.csr_file) {
        const ext = form.csr_file.name.split('.').pop();
        const path = `${userIndustry.id}/${year}-${month}-csr.${ext}`;
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
            industry_id:     userIndustry.id,
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
    const submissionDate = new Date().toLocaleDateString('en-IN');
    const reportMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    // Clean formatting helper — avoids jsPDF character-spacing bugs
    const clean = (val: string) => (val || '').replace(/[^\d.]/g, '');
    const formatCurrency = (val: string, unit: string) => {
      const num = parseFloat(clean(val) || '0');
      const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `₹ ${formatted} ${unit}`;
    };

    const fmtInt = (n: string) => {
      const num = parseInt(clean(n) || '0', 10);
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const empMale         = fmtInt(form.emp_male);
    const empFemale       = fmtInt(form.emp_female);
    const empContractual  = fmtInt(form.emp_contractual);
    const empTotal        = parseInt(clean(form.emp_male) || '0') + 
                            parseInt(clean(form.emp_female) || '0') + 
                            parseInt(clean(form.emp_contractual) || '0');

    const workforce = `${empMale} Male | ${empFemale} Female | ${empContractual} Contractual`;

    const investmentVal  = formatCurrency(form.investment_cr, 'Cr');
    const turnoverVal    = formatCurrency(form.turnover_cr, 'Cr');
    const waterVal       = `${parseFloat(clean(form.water_kld) || '0').toFixed(2)} KLD`;
    const powerVal       = `${parseFloat(clean(form.power_kwh) || '0').toFixed(2)} kWh`;
    const csrVal         = formatCurrency(form.csr_spend_lakhs, 'Lakhs');
    const csrActivity    = (form.csr_activity || '').trim() || '—';

    const attachmentList = form.csr_file ? form.csr_file.name : 'No supporting document uploaded.';

    // ── Background Layer (Watermark) ──────────────────────────────────────────
    doc.saveGraphicsState();
    doc.setTextColor(242, 245, 250); // Very light grey-blue
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(55);
    doc.text('SYSTEM GENERATED', pageW / 2, pageH / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();

    // ── Header band ───────────────────────────────────────────────────────────
    doc.setFillColor(0, 51, 102); // Dark Navy
    doc.rect(0, 0, pageW, 35, 'F');

    // Amber accent stripe
    doc.setFillColor(255, 153, 0); // Gold
    doc.rect(0, 35, pageW, 2, 'F');

    // Emblem circle (Top Right)
    doc.setFillColor(255, 255, 255);
    doc.circle(pageW - 24, 17, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('SIPCOT', pageW - 24, 15.5, { align: 'center' });
    doc.text('EMBLEM', pageW - 24, 19, { align: 'center' });

    // Header text
    doc.setTextColor(255, 153, 0);
    doc.setFontSize(7.5);
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
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageW - margin * 2, 9, 'F');
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, pageW - margin * 2, 9, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 51, 102);
    doc.text('OFFICIAL SUBMISSION ACKNOWLEDGEMENT', pageW / 2, y + 6, { align: 'center' });

    y += 14;

    // ── SECTION A: Industry Identification ───────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text('SECTION A \u2014 INDUSTRY IDENTIFICATION', margin, y);
    doc.setDrawColor(255, 153, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
      styles: { fontSize: 9, cellPadding: 3.5, lineWidth: 0.1, lineColor: [210, 218, 230], halign: 'left' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [0, 51, 102], cellWidth: 55, fillColor: [250, 252, 255] },
        1: { cellWidth: 'auto' },
      },
      body: [
        ['Reference ID', refId],
        ['Allottee / Industry', userIndustry?.name || 'N/A'],
        ['Reporting Period', reportMonth],
        ['Submission Date', submissionDate],
        ['Filing Status', 'PENDING VERIFICATION'],
      ],
      didParseCell: (data: any) => {
        if (data.row.index === 4 && data.column.index === 1) {
          data.cell.styles.fillColor = [255, 251, 235]; // Light Amber (#FFFBEB)
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
    doc.setLineWidth(0.5);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
      head: [['Category', 'Metric', 'Value']],
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: [210, 218, 230],
        font: 'helvetica',
        halign: 'left',
      },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [0, 51, 102], cellWidth: 40, valign: 'middle' },
        1: { cellWidth: 60, textColor: [50, 50, 50] },
        2: { cellWidth: 'auto', fontStyle: 'bold', textColor: [0, 0, 0] },
      },
      body: [
        [{ content: 'ECONOMIC', rowSpan: 2 }, 'Total Investment', investmentVal],
        ['Annual Turnover', turnoverVal],
        [{ content: 'HUMAN RESOURCES', rowSpan: 2 }, 'Total Workforce', `${fmtInt(String(empTotal))} employees`],
        ['Workforce Breakdown', workforce],
        [{ content: 'ENVIRONMENTAL', rowSpan: 2 }, 'Water Consumption', waterVal],
        ['Power Consumption', powerVal],
        [{ content: 'ENVIRONMENTAL / CSR', rowSpan: 2 }, 'CSR Expenditure', csrVal],
        ['CSR Activity', csrActivity],
      ],
      didParseCell: (data: any) => {
        // Apply category backgrounds
        if (data.column.index === 0 && data.cell.raw) {
          const content = (data.cell.raw as any).content || data.cell.raw;
          if (content === 'ECONOMIC') data.cell.styles.fillColor = [240, 247, 255];
          if (content === 'HUMAN RESOURCES') data.cell.styles.fillColor = [240, 253, 244];
          if (content.includes('ENVIRONMENTAL')) data.cell.styles.fillColor = [245, 243, 255];
        }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── SECTION C: Attachment Manifest ────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text('SECTION C \u2014 ATTACHMENT MANIFEST', margin, y);
    doc.setDrawColor(255, 153, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
      styles: { fontSize: 9, cellPadding: 3.5, lineWidth: 0.1, lineColor: [210, 218, 230], halign: 'left' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [0, 51, 102], fillColor: [250, 252, 255], cellWidth: 55 },
        1: { cellWidth: 'auto' },
      },
      body: [
        ['Supporting Document', attachmentList],
        ['CSR Activity Description', form.csr_activity || 'Not provided'],
        ['Upload Status', form.csr_file ? 'Document attached and uploaded.' : 'No document uploaded.'],
      ],
    });

    // ── Page footer ──────────────────────────────────────────────────────────
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFontSize(7);
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
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <UserNav />
          </div>
        }
      />

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Industry Info */}
        <div className="bg-[#003366]/5 border border-[#003366]/20 rounded-xl px-5 py-3 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center text-white font-bold">
              {userIndustry?.name.charAt(0) || 'I'}
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">Logged in Industry</span>
              <span className="text-[#003366] font-bold">{userIndustry?.name || (authLoading ? 'Loading...' : 'Not Found')}</span>
            </div>
          </div>
          {userIndustry && (
            <div className="text-right">
              <span className="text-green-600 font-bold text-xs flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Verified Account
              </span>
              <span className="text-gray-400 text-[10px] block mt-0.5">ID: {userIndustry.id.slice(0,8).toUpperCase()}</span>
            </div>
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
        {!userIndustry && !authLoading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#003366] mb-2">Link Your Industry Account</h2>
            <p className="text-gray-500 text-sm mb-6">
              Your account is not yet associated with an industry record. Please select your company from the list below to proceed with reporting.
            </p>
            
            <div className="relative mb-6">
              <input 
                type="text"
                placeholder="Search by company name or allottee code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-3 pl-10 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 text-left">
              {allIndustries
                .filter(i => 
                  i.name.toLowerCase().includes(search.toLowerCase()) || 
                  i.allottee_code?.toLowerCase().includes(search.toLowerCase())
                )
                .map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => handleLinkIndustry(ind.id)}
                    disabled={linking}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group disabled:opacity-50"
                  >
                    <div>
                      <p className="font-bold text-[#003366] text-sm group-hover:text-[#FF9900] transition-colors">{ind.name}</p>
                      <p className="text-xs text-gray-400">{ind.allottee_code || 'No code'} • {ind.sector || 'Various'}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-[#FF9900]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              {allIndustries.length === 0 && (
                <p className="py-8 text-gray-400 text-sm">No industries found in database.</p>
              )}
            </div>
          </div>
        ) : (
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
                  disabled={authLoading || !userIndustry}
                  className="px-8 py-2.5 bg-[#003366] text-white rounded-xl font-semibold text-sm hover:bg-[#004d99] transition-colors disabled:opacity-50"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !userIndustry}
                  className="px-8 py-2.5 bg-[#FF9900] text-white rounded-xl font-bold text-sm hover:bg-[#e68a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting…</>
                  ) : '✓ Submit Report'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

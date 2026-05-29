'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Building2,
  User,
  Mail,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
  TrendingUp,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, type MonthlyReport, type ReportStatus } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// --- Month helper ---
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  industry_name?: string;
  allottee_code?: string;
  district?: string;
}

export default function IndustryDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [industryName, setIndustryName] = useState<string>('');
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pdfGeneratingId, setPdfGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Get logged-in user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          router.push('/login');
          return;
        }

        // 2. Fetch profile metrics
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profileData) {
          toast.error('Failed to load user profile');
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // 3. Resolve associated Industry record
        let activeIndustry = null;

        // Try user_id first
        const { data: indByUserId } = await supabase
          .from('industries')
          .select('id, name')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (indByUserId) {
          activeIndustry = indByUserId;
        } else if (profileData.allottee_code) {
          // Fallback to allottee code
          const { data: indByCode } = await supabase
            .from('industries')
            .select('id, name')
            .eq('allottee_code', profileData.allottee_code)
            .maybeSingle();
          if (indByCode) activeIndustry = indByCode;
        }

        if (!activeIndustry) {
          toast.error('No registered industry matches this account. Please update your profile.');
          setLoading(false);
          return;
        }

        setIndustryName(activeIndustry.name);

        // 4. Query historical monthly reports
        const { data: reportsData, error: reportsError } = await supabase
          .from('monthly_reports')
          .select('*')
          .eq('industry_id', activeIndustry.id)
          .order('year', { ascending: true })
          .order('month', { ascending: true });

        if (reportsError) throw reportsError;

        setReports(reportsData || []);

      } catch (err: any) {
        console.error('Error fetching dashboard statistics:', err);
        toast.error('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  // --- Derived Statistics ---
  const latestReport = useMemo(() => {
    if (reports.length === 0) return null;
    // Reports are chronologically sorted (ascending), so latest is the last one
    return reports[reports.length - 1];
  }, [reports]);

  const chartData = useMemo(() => {
    return reports.map(r => ({
      name: `${MONTH_NAMES[r.month - 1].slice(0, 3)} ${r.year}`,
      Water: r.water_kld || 0,
      Power: r.power_kwh || 0,
    }));
  }, [reports]);

  // --- PDF Receipt Generator ---
  const handleDownloadPDF = async (report: MonthlyReport) => {
    setPdfGeneratingId(report.id);
    const toastId = toast.loading(`Compiling Compliance Receipt for ${MONTH_NAMES[report.month - 1]} ${report.year}...`);

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;

      const refId = 'SIPCOT-' + report.id.slice(0, 8).toUpperCase();
      const submissionDate = report.submitted_at 
        ? new Date(report.submitted_at).toLocaleDateString('en-IN') 
        : new Date().toLocaleDateString('en-IN');
      const reportMonth = `${MONTH_NAMES[report.month - 1]} ${report.year}`;

      // Watermark
      doc.saveGraphicsState();
      doc.setTextColor(242, 245, 250);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(55);
      doc.text('SYSTEM GENERATED', pageW / 2, pageH / 2, { align: 'center', angle: 45 });
      doc.restoreGraphicsState();

      // Header band
      doc.setFillColor(0, 51, 102); 
      doc.rect(0, 0, pageW, 35, 'F');

      // Accent stripe
      doc.setFillColor(255, 153, 0); 
      doc.rect(0, 35, pageW, 2, 'F');

      // Title bar
      doc.setTextColor(255, 153, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('GOVERNMENT OF TAMIL NADU  \u00b7  SIPCOT TRACK PORTAL', margin, 10);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Compliance Submission Acknowledgement', margin, 20);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Filing Acknowledgement Copy — Industry Dashboard Export', margin, 28);

      let y = 46;
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageW - margin * 2, 9, 'F');
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, pageW - margin * 2, 9, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 51, 102);
      doc.text('SIPCOT OFFICIAL DATA RECORD RECEIPT', pageW / 2, y + 6, { align: 'center' });

      y += 14;

      // SECTION A: Registration Detail
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SECTION A \u2014 REGISTRATION & FILING SUMMARY', margin, y);
      doc.setDrawColor(255, 153, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
      y += 5;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        tableWidth: pageW - margin * 2,
        styles: { fontSize: 8.5, cellPadding: 3.5, lineWidth: 0.1, lineColor: [210, 218, 230] },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [0, 51, 102], cellWidth: 50, fillColor: [250, 252, 255] },
          1: { cellWidth: 'auto' },
        },
        body: [
          ['Filing Receipt Reference ID', refId],
          ['Registered Industry Name', industryName || 'N/A'],
          ['Reporting Compliance Period', reportMonth],
          ['Filing Submitted Date', submissionDate],
          ['Filing Audit Status', report.status.toUpperCase()],
        ],
        didParseCell: (data: any) => {
          if (data.row.index === 4 && data.column.index === 1) {
            if (report.status === 'approved') {
              data.cell.styles.fillColor = [240, 253, 244];
              data.cell.styles.textColor = [22, 101, 52];
            } else if (report.status === 'pending') {
              data.cell.styles.fillColor = [254, 253, 237];
              data.cell.styles.textColor = [146, 64, 14];
            } else {
              data.cell.styles.fillColor = [254, 242, 242];
              data.cell.styles.textColor = [153, 27, 27];
            }
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // SECTION B: Performance Data
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SECTION B \u2014 RECORDED PERFORMANCE METRICS', margin, y);
      doc.setDrawColor(255, 153, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
      y += 5;

      const empBreakdown = `${report.emp_male} Male | ${report.emp_female} Female | ${report.emp_contractual} Contractual`;
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        tableWidth: pageW - margin * 2,
        head: [['Performance Category', 'Filing Parameter', 'Recorded Value']],
        styles: { fontSize: 8.5, cellPadding: 3.5, lineWidth: 0.1, lineColor: [210, 218, 230] },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [0, 51, 102], cellWidth: 40, valign: 'middle' },
          1: { cellWidth: 60 },
          2: { cellWidth: 'auto', fontStyle: 'bold' }
        },
        body: [
          [{ content: 'FINANCIAL METRICS', rowSpan: 2 }, 'Cumulative Capital Investment', `₹ ${report.investment_cr?.toFixed(2) || '0.00'} Crore`],
          ['Estimated Annual Turnover', `₹ ${report.turnover_cr?.toFixed(2) || '0.00'} Crore`],
          [{ content: 'WORKFORCE INTENSITY', rowSpan: 2 }, 'Total Workforce Headcount', `${report.emp_total} employees`],
          ['Demographic Breakdown', empBreakdown],
          [{ content: 'UTILITIES RESOURCE', rowSpan: 2 }, 'Average Daily Water Consumption', `${report.water_kld?.toFixed(2) || '0.00'} KLD`],
          ['Power Grid Consumption', `${report.power_kwh?.toFixed(2) || '0.00'} kWh`],
          [{ content: 'CORPORATE COMPLIANCE', rowSpan: 2 }, 'Corporate Social Responsibility (CSR) Spend', `₹ ${report.csr_spend_lakhs?.toFixed(2) || '0.00'} Lakhs`],
          ['CSR Activity Summary', (report.csr_activity || 'No CSR activity reported').trim()],
        ],
        didParseCell: (data: any) => {
          if (data.column.index === 0 && data.cell.raw) {
            const content = (data.cell.raw as any).content || data.cell.raw;
            if (content.includes('FINANCIAL')) data.cell.styles.fillColor = [240, 247, 255];
            if (content.includes('WORKFORCE')) data.cell.styles.fillColor = [240, 253, 244];
            if (content.includes('UTILITIES')) data.cell.styles.fillColor = [255, 251, 235];
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // Signature/Footnote
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.3);
      doc.line(margin, pageH - 15, pageW - margin, pageH - 15);
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text(`Filing Receipt: ${refId}  \u00b7  Exported: ${new Date().toLocaleString()}`, pageW / 2, pageH - 10, { align: 'center' });
      doc.text('Page 1 of 1', pageW - margin, pageH - 10, { align: 'right' });

      doc.save(`Compliance_Receipt_${reportMonth.replace(' ', '_')}.pdf`);
      toast.success('Compliance receipt PDF exported successfully!');
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      toast.error('Could not generate PDF: ' + err.message);
    } finally {
      setPdfGeneratingId(null);
      toast.dismiss(toastId);
    }
  };

  const getStatusClass = (status: ReportStatus) => {
    switch (status) {
      case 'approved':
        return {
          banner: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
          iconColor: 'text-emerald-500',
          label: 'Verified Compliance File'
        };
      case 'pending':
        return {
          banner: 'bg-amber-50 border-amber-200 text-amber-800',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Clock,
          iconColor: 'text-amber-500',
          label: 'Filing Pending Verification'
        };
      case 'rejected':
        return {
          banner: 'bg-red-50 border-red-200 text-red-800',
          badge: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          label: 'Filing Rejected'
        };
      default:
        return {
          banner: 'bg-slate-50 border-slate-200 text-slate-800',
          badge: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Clock,
          iconColor: 'text-slate-500',
          label: 'Filing Status Unknown'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#003366] animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Compiling your workspace metrics...</p>
      </div>
    );
  }

  const latestMeta = latestReport ? getStatusClass(latestReport.status) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#003366] tracking-tight">
            Industry Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Filing compliance, logs, and analytics oversight for <span className="font-semibold text-slate-700">{industryName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push('/dashboard/industry/submit-report')}
            className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-5 py-2.5 rounded-lg active:scale-95 transition-all shadow-sm flex items-center gap-2"
          >
            Submit Monthly Report
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* A. Real-time Status Banner */}
      {latestReport && latestMeta && (
        <Card className={`border p-5 rounded-xl shadow-sm transition-all ${latestMeta.banner}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <latestMeta.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${latestMeta.iconColor}`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                    Latest Filing Status:
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${latestMeta.badge}`}>
                    {latestReport.status}
                  </span>
                </div>
                <h3 className="font-extrabold text-base">
                  Reporting Period: {MONTH_NAMES[latestReport.month - 1]} {latestReport.year}
                </h3>
                <p className="text-xs opacity-85">
                  Submitted at: {new Date(latestReport.submitted_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
                {latestReport.status === 'rejected' && latestReport.rejection_reason && (
                  <div className="mt-3 bg-white/60 border border-red-200 rounded-lg p-3 max-w-2xl text-xs text-red-800 font-medium">
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-red-500 mb-0.5">Rejection Reason:</span>
                    {latestReport.rejection_reason}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReport(latestReport);
                  setShowDetailModal(true);
                }}
                className="bg-white hover:bg-slate-50 text-[#003366] font-bold border-slate-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Eye className="w-4 h-4" />
                View This Month's Data
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Row containing Recharts Chart & Quick-Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* B. Analytical Performance Monitoring Card */}
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-[#003366]">Resource Consumption Analysis</h2>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                12-Month Trend
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">Historical tracker for water consumption and power load grids</p>
          </div>

          <div className="h-[280px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Insufficient reports filed to render analytical trend lines</p>
                <p className="text-[10px] mt-0.5">Please submit monthly metrics to begin profiling</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />
                  <Line
                    name="Water Usage (KLD)"
                    type="monotone"
                    dataKey="Water"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ r: 4, stroke: '#3B82F6', strokeWidth: 1.5, fill: '#fff' }}
                  />
                  <Line
                    name="Power Usage (kWh)"
                    type="monotone"
                    dataKey="Power"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    dot={{ r: 4, stroke: '#F97316', strokeWidth: 1.5, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* C. Quick-Action Profile Details Card */}
        <Card className="bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#003366]">Profile & Authorized Officer</h2>
              <p className="text-xs text-slate-400">Compliance authority details linked to this portal session</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <Building2 className="w-4 h-4 text-[#003366] mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Company name</span>
                  <span className="text-sm font-extrabold text-[#003366] truncate block">{industryName || 'N/A'}</span>
                  {profile?.allottee_code && (
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5 uppercase">ALLOTTEE CODE: {profile.allottee_code}</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <User className="w-4 h-4 text-[#003366] mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Filing Officer</span>
                  <span className="text-sm font-extrabold text-[#003366] truncate block">{profile?.full_name || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <Mail className="w-4 h-4 text-[#003366] mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider"> Filer Email Contact</span>
                  <span className="text-sm font-extrabold text-[#003366] truncate block">{profile?.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => router.push('/dashboard/profile')}
            className="w-full mt-6 bg-[#003366] hover:bg-[#002244] text-white font-bold py-3 rounded-xl transition-all shadow-sm text-xs flex items-center justify-center gap-1.5"
          >
            Modify Officer Profile
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      {/* D. Historical Compliance Registry Table */}
      <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#003366]">Historical Compliance Registry</h2>
            <p className="text-xs text-slate-400 mt-0.5">Logs of all previous monthly reports processed in the database</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Total Filings: {reports.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="px-6 py-3.5 font-semibold">Filing Period</th>
                <th className="px-4 py-3.5 font-semibold text-right">Investment (Cr)</th>
                <th className="px-4 py-3.5 font-semibold text-right">Water Usage (KLD)</th>
                <th className="px-4 py-3.5 font-semibold text-right">Power Usage (kWh)</th>
                <th className="px-4 py-3.5 font-semibold text-center">Compliance Status</th>
                <th className="px-6 py-3.5 font-semibold text-center w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    No compliance history found. Please file a report.
                  </td>
                </tr>
              ) : (
                [...reports].reverse().map(report => {
                  const meta = getStatusClass(report.status);
                  const isPdfGenerating = pdfGeneratingId === report.id;

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#003366]">
                        {MONTH_NAMES[report.month - 1]} {report.year}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-slate-700">
                        {report.investment_cr != null ? `₹${report.investment_cr.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-slate-700">
                        {report.water_kld != null ? `${report.water_kld.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-slate-700">
                        {report.power_kwh != null ? `${report.power_kwh.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${meta.badge}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#003366] hover:bg-slate-100 rounded-md transition-colors"
                            title="View submission details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(report)}
                            disabled={isPdfGenerating}
                            className="p-1.5 text-slate-400 hover:text-[#FF9900] hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40"
                            title="Download PDF Receipt"
                          >
                            {isPdfGenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#FF9900]" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submission Detail Overlay / Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#003366] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#FF9900]" />
                <h3 className="font-extrabold text-base">
                  Filing Detail: {MONTH_NAMES[selectedReport.month - 1]} {selectedReport.year}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReport(null);
                }}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Status Header inside modal */}
              <div className={`p-4 border rounded-xl flex items-center gap-3 ${getStatusClass(selectedReport.status).banner}`}>
                {(() => {
                  const meta = getStatusClass(selectedReport.status);
                  return (
                    <>
                      <meta.icon className={`w-5 h-5 flex-shrink-0 ${meta.iconColor}`} />
                      <div>
                        <p className="text-xs uppercase font-extrabold tracking-wider text-slate-400"> Filer Audit Result</p>
                        <p className="text-sm font-bold capitalize">{selectedReport.status} Compliance Record</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {selectedReport.status === 'rejected' && selectedReport.rejection_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
                  <span className="font-bold block uppercase tracking-wider text-[10px] text-red-500 mb-0.5">Rejection reason:</span>
                  {selectedReport.rejection_reason}
                </div>
              )}

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Financials block */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Financial Indicators</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Investment</span>
                      <span className="font-bold text-[#003366]">
                        {selectedReport.investment_cr != null ? `₹${selectedReport.investment_cr.toFixed(2)} Cr` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Turnover</span>
                      <span className="font-bold text-[#003366]">
                        {selectedReport.turnover_cr != null ? `₹${selectedReport.turnover_cr.toFixed(2)} Cr` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Utilities block */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Utility Loads</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Water Consumption</span>
                      <span className="font-bold text-[#003366]">
                        {selectedReport.water_kld != null ? `${selectedReport.water_kld.toFixed(2)} KLD` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Power Grid</span>
                      <span className="font-bold text-[#003366]">
                        {selectedReport.power_kwh != null ? `${selectedReport.power_kwh.toFixed(2)} kWh` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workforce block */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 md:col-span-2">
                  <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Workforce & Employment Intensity</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Male</span>
                      <span className="font-bold text-[#003366]">{selectedReport.emp_male}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Female</span>
                      <span className="font-bold text-[#003366]">{selectedReport.emp_female}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Contractual</span>
                      <span className="font-bold text-[#003366]">{selectedReport.emp_contractual}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold text-slate-600">Total Workforce</span>
                      <span className="font-extrabold text-emerald-600 text-sm">{selectedReport.emp_total}</span>
                    </div>
                  </div>
                </div>

                {/* CSR block */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 md:col-span-2">
                  <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Corporate Social Responsibility (CSR)</h4>
                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 block">CSR Spend Contribution</span>
                      <span className="font-bold text-[#003366]">
                        {selectedReport.csr_spend_lakhs != null ? `₹${selectedReport.csr_spend_lakhs.toFixed(2)} Lakhs` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">CSR Activity Description</span>
                      <p className="text-slate-700 mt-1 italic whitespace-pre-line leading-relaxed">
                        {selectedReport.csr_activity || 'No CSR activity reported.'}
                      </p>
                    </div>
                    {selectedReport.csr_file_url && (
                      <div className="pt-2">
                        <a
                          href={selectedReport.csr_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-[#003366] hover:underline"
                        >
                          View Uploaded CSR Document
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                RECORD ID: {selectedReport.id.toUpperCase()}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReport(null);
                  }}
                  variant="outline"
                  className="border-slate-200 text-slate-600 px-4 py-2 font-semibold text-xs"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(selectedReport)}
                  className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 font-semibold text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF Receipt
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Droplets, Leaf, Building2,
  AlertTriangle, Download, Loader2, FileText,
} from 'lucide-react';
import { BrandHeader } from '@/components/BrandHeader';
import { UserNav } from '@/components/UserNav';
import dynamic from 'next/dynamic';
import type { ParkData } from '@/components/ParkMap';
import { generateAdminPDF } from '@/lib/adminPdfExport';
import { supabase, type ParkSummary } from '@/lib/supabase';

const ParkMap = dynamic(() => import('@/components/ParkMap'), { ssr: false });

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  navy:    '#003366',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  slate:   '#64748B',
};

const CHART_COLORS = ['#003366', '#10B981', '#F59E0B', '#8B5CF6', '#94A3B8', '#EC4899', '#06B6D4'];

// ── Types ───────────────────────────────────────────────────────────────────
interface MonthlyData {
  month: string;
  investment: number;
  employment: number;
  water: number;
  csr: number;
  sortKey: number; // For sorting months correctly
}

interface SectorData {
  name: string;
  value: number;
  color: string;
}

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const pts = data.map((v, i) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={pts}>
        <Line type="monotone" dataKey="v" stroke={C.navy} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function KPICard({
  icon: Icon, title, value, sub, trend, sparkData, color, delay,
}: {
  icon: any; title: string; value: string; sub: string;
  trend: string; sparkData: number[]; color: string; delay: number;
}) {
  const trendNum = parseFloat(trend);
  const isZero = trendNum === 0 || isNaN(trendNum);
  const up = trendNum > 0;
  
  return (
    <motion.div {...fadeUp(delay)}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        </div>
        {!isZero && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(trendNum)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-800">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
      <Sparkline data={sparkData.length > 0 ? sparkData : [0, 0, 0]} />
    </motion.div>
  );
}

function SemiGauge({ label, value, capacity, unit }: {
  label: string; value: number; capacity: number; unit: string;
}) {
  const pct = Math.min((value / capacity) * 100, 100);
  const color = pct > 90 ? C.red : pct > 80 ? C.amber : C.emerald;
  const r = 52, cx = 70, cy = 70;
  const circumference = Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={140} height={80} viewBox="0 0 140 80">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke="#E2E8F0" strokeWidth={10} strokeLinecap="round" />
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={16} fontWeight="800" fill="#1E293B">
          {pct.toFixed(0)}%
        </text>
        <text x={cx} y={cy+8} textAnchor="middle" fontSize={9} fill="#94A3B8">
          {value.toLocaleString()} / {capacity.toLocaleString()} {unit}
        </text>
      </svg>
      <p className="text-xs font-semibold text-slate-600 -mt-1">{label}</p>
      {pct > 80 && (
        <span className="text-xs font-bold mt-1 flex items-center gap-1" style={{ color }}>
          <AlertTriangle size={10} /> {pct > 90 ? 'CRITICAL' : 'HIGH'}
        </span>
      )}
    </div>
  );
}

function InvestmentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const inv = payload.find((p: any) => p.dataKey === 'investment')?.value ?? 0;
  const emp = payload.find((p: any) => p.dataKey === 'employment')?.value ?? 1;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      <p className="text-[#003366]">Investment: <strong>₹{inv.toFixed(1)} Cr</strong></p>
      <p className="text-emerald-600">Employment: <strong>{emp.toLocaleString()}</strong></p>
      <p className="text-amber-600 mt-1 border-t border-slate-100 pt-1">
        Inv/Employee: <strong>₹{emp > 0 ? ((inv * 10000000) / emp).toFixed(0) : 0}</strong>
      </p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [parks, setParks] = useState<ParkSummary[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [activeSlice, setActiveSlice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 1. Fetch Park Summary
        const { data: parkData } = await supabase.from('park_summary').select('*');
        if (parkData) setParks(parkData);

        // 2. Fetch Monthly Aggregates
        // We'll fetch all approved/pending reports from the last 12 months
        const { data: reports } = await supabase
          .from('verification_queue')
          .select('month, year, investment_cr, emp_total, water_kld, csr_spend_lakhs, sector')
          .neq('status', 'rejected');

        if (reports) {
          // Process Monthly Data
          const monthMap: Record<string, MonthlyData> = {};
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          reports.forEach(r => {
            const key = `${monthNames[r.month - 1]} ${r.year}`;
            if (!monthMap[key]) {
              monthMap[key] = {
                month: key,
                investment: 0,
                employment: 0,
                water: 0,
                csr: 0,
                sortKey: r.year * 100 + r.month
              };
            }
            monthMap[key].investment += Number(r.investment_cr || 0);
            monthMap[key].employment += Number(r.emp_total || 0);
            monthMap[key].water      += Number(r.water_kld || 0);
            monthMap[key].csr        += Number(r.csr_spend_lakhs || 0);
          });

          const monthlyList = Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey);
          setMonthly(monthlyList);

          // Process Sector Data
          const sectorMap: Record<string, number> = {};
          reports.forEach(r => {
            if (!r.sector) return;
            sectorMap[r.sector] = (sectorMap[r.sector] || 0) + Number(r.investment_cr || 0);
          });

          const totalInv = Object.values(sectorMap).reduce((a, b) => a + b, 0);
          const sectorList = Object.entries(sectorMap)
            .map(([name, val], i) => ({
              name,
              value: totalInv > 0 ? Math.round((val / totalInv) * 100) : 0,
              color: CHART_COLORS[i % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
          
          setSectors(sectorList);
        }

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateAdminPDF();
    } finally {
      setExporting(false);
    }
  };

  // ── Derived Stats ────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalInv   = parks.reduce((s, p) => s + (p.total_investment_cr || 0), 0);
    const totalJobs  = parks.reduce((s, p) => s + (p.total_jobs || 0), 0);
    const totalWater = parks.reduce((s, p) => s + (p.total_water_kld || 0), 0);
    const totalCSR   = parks.reduce((s, p) => s + (p.total_csr_spend_lakhs || 0), 0);
    
    // Growth trends (comparing last 2 months if available)
    let invTrend = '0';
    let jobTrend = '0';
    let waterTrend = '0';
    let csrTrend = '0';

    if (monthly.length >= 2) {
      const latest = monthly[monthly.length - 1];
      const prev   = monthly[monthly.length - 2];
      
      const calcPct = (curr: number, old: number) => 
        old > 0 ? (((curr - old) / old) * 100).toFixed(1) : '0';

      invTrend   = calcPct(latest.investment, prev.investment);
      jobTrend   = calcPct(latest.employment, prev.employment);
      waterTrend = calcPct(latest.water, prev.water);
      csrTrend   = calcPct(latest.csr, prev.csr);
    }

    return { totalInv, totalJobs, totalWater, totalCSR, invTrend, jobTrend, waterTrend, csrTrend };
  }, [parks, monthly]);

  const waterAlerts = parks.filter(p => p.has_water_alert || p.total_water_kld > 1000);

  const parkMapData: ParkData[] = parks.map(p => ({
    id: p.park_id,
    name: p.park_name,
    lat: p.latitude,
    lng: p.longitude,
    water_kld: p.total_water_kld,
    investment_cr: p.total_investment_cr,
    total_jobs: p.total_jobs,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#003366] animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Aggregating State-Wide Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandHeader
        subtitle="Intelligence Dashboard"
        rightContent={
          <>
            <a href="/admin/verify"
              className="text-white/80 hover:text-[#FF9900] text-sm font-medium transition-colors flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Verification Queue
              {parks.some(p => p.pending_reports > 0) && (
                <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
              )}
            </a>
            <a href="/dashboard/admin/forms"
              className="text-white/80 hover:text-[#FF9900] text-sm font-medium transition-colors flex items-center gap-1.5">
              <FileText size={14} />
              Form Builder
            </a>
            <a href="/dashboard/admin/users"
              className="text-white/80 hover:text-[#FF9900] text-sm font-medium transition-colors flex items-center gap-1.5">
              <Users size={14} />
              User Management
            </a>
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 bg-[#FF9900] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-60">
              <Download size={13} /> {exporting ? 'Generating…' : 'Export PDF'}
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <UserNav />
          </>
        }
      />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

        {/* Page Title */}
        <motion.div {...fadeUp(0)}>
          <h1 className="text-xl font-extrabold text-slate-800">State-Wide Industrial Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">Tamil Nadu · SIPCOT Parks · Live Analytics</p>
        </motion.div>

        {/* ── I. KPI Scorecards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={TrendingUp}  title="Total Investment"   delay={0.05}
            value={`₹${totals.totalInv.toLocaleString()} Cr`} sub="Cumulative (Approved)"
            trend={totals.invTrend} sparkData={monthly.map(m => m.investment)} color={C.navy} />
          <KPICard icon={Users}       title="Workforce"          delay={0.10}
            value={totals.totalJobs.toLocaleString()} sub="Direct + Contractual"
            trend={totals.jobTrend} sparkData={monthly.map(m => m.employment)} color={C.emerald} />
          <KPICard icon={Droplets}    title="Water Consumption"  delay={0.15}
            value={`${totals.totalWater.toLocaleString()} KLD`} sub="Daily usage aggregate"
            trend={totals.waterTrend} sparkData={monthly.map(m => m.water)} color={C.amber} />
          <KPICard icon={Leaf}        title="CSR Spend"          delay={0.20}
            value={`₹${totals.totalCSR.toFixed(1)} L`} sub="Cumulative CSR Spend"
            trend={totals.csrTrend} sparkData={monthly.map(m => m.csr)} color="#8B5CF6" />
        </div>

        {/* ── II. Intelligence Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Composed Chart — col-span-8 */}
          <motion.div {...fadeUp(0.2)} className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Investment vs Employment Trend</h2>
                <p className="text-xs text-slate-400">Monthly performance · Bars = Investment · Line = Jobs</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthly} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="inv" orientation="left"
                  tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v}`} />
                <YAxis yAxisId="emp" orientation="right"
                  tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => (v/1000).toFixed(0)+'k'} />
                <Tooltip content={<InvestmentTooltip />} />
                <Bar yAxisId="inv" dataKey="investment" fill="#003366" radius={[4,4,0,0]} opacity={0.85} />
                <Line yAxisId="emp" type="monotone" dataKey="employment" stroke={C.emerald}
                  strokeWidth={2.5} dot={{ r: 3, fill: C.emerald }} />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Donut Chart — col-span-4 */}
          <motion.div {...fadeUp(0.25)} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 text-sm mb-1">Sector Distribution</h2>
            <p className="text-xs text-slate-400 mb-4">Investment share by industry sector</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sectors} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}
                  onClick={(d) => { setActiveSlice(d.name === activeSlice ? null : d.name); }}>
                  {sectors.map((s) => (
                    <Cell key={s.name} fill={s.color}
                      opacity={activeSlice && activeSlice !== s.name ? 0.4 : 1}
                      stroke={activeSlice === s.name ? '#fff' : 'none'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2 max-h-[140px] overflow-y-auto pr-1">
              {sectors.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs cursor-pointer group"
                  onClick={() => { setActiveSlice(s.name === activeSlice ? null : s.name); }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: s.color }} />
                    <span className={`font-medium transition-colors ${activeSlice === s.name ? 'text-[#003366] font-bold' : 'text-slate-500 group-hover:text-slate-800'}`}>{s.name}</span>
                  </div>
                  <span className="font-bold text-slate-700">{s.value}%</span>
                </div>
              ))}
              {sectors.length === 0 && (
                <p className="text-center text-slate-400 text-xs py-10">No sector data available</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── III. Resource Stress ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Gauges */}
          <motion.div {...fadeUp(0.3)} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 text-sm mb-4">Resource Capacity Utilization</h2>
            <div className="flex justify-around">
              <SemiGauge label="Water Usage" value={totals.totalWater} capacity={20000} unit="KLD" />
              <SemiGauge label="Power Load" value={monthly.reduce((s,m)=>s+m.water,0)/10} capacity={10000} unit="MWh" />
            </div>
          </motion.div>

          {/* Water Alert Table */}
          <motion.div {...fadeUp(0.35)} className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-[#FF9900]" />
              <h2 className="font-bold text-slate-800 text-sm">Industrial Parks Alert Status</h2>
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${waterAlerts.length > 0 ? 'bg-amber-100 text-[#FF9900]' : 'bg-emerald-100 text-emerald-700'}`}>
                {waterAlerts.length} alerts active
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Park','District','Water (KLD)','Jobs','Investment (Cr)','Status'].map(h => (
                      <th key={h} className="text-left py-2 text-slate-400 font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {parks.map(p => {
                    const crit = p.has_water_alert || p.total_water_kld > 2000;
                    const high = p.total_water_kld > 1000;
                    return (
                      <tr key={p.park_id} className={`${crit ? 'bg-red-50/50' : high ? 'bg-amber-50/40' : ''} hover:bg-slate-50 transition-colors`}>
                        <td className="py-2.5 font-semibold text-slate-800 pr-4">{p.park_name}</td>
                        <td className="py-2.5 text-slate-500">{p.district}</td>
                        <td className="py-2.5">
                          <span className={`font-bold ${crit ? 'text-red-600' : high ? 'text-amber-600' : 'text-slate-700'}`}>
                            {p.total_water_kld.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600">{p.total_jobs.toLocaleString()}</td>
                        <td className="py-2.5 text-slate-600">₹{p.total_investment_cr.toLocaleString()}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${crit ? 'bg-red-100 text-red-700' : high ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {crit ? '🔴 Critical' : high ? '🟡 Alert' : '🟢 Normal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {parks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">No park data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* ── IV. Advanced Analytics ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Analytics cards */}
          <motion.div {...fadeUp(0.4)} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 text-sm mb-4">Efficiency Metrics</h2>
            <div className="space-y-4">
              {/* Water Efficiency Index */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Water Efficiency Index</span>
                  <span className="text-sm font-extrabold" style={{ color: C.navy }}>
                    {totals.totalWater > 0 ? (totals.totalInv / totals.totalWater).toFixed(3) : '0.000'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Investment (Cr) ÷ Water (KLD) · Higher = More Efficient</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#003366] rounded-full" style={{ width: `${Math.min((totals.totalInv / totals.totalWater || 0) * 100, 100)}%` }} />
                </div>
              </div>

              {/* Jobs Intensity */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Jobs per Crore Investment</span>
                  <span className="text-sm font-extrabold" style={{ color: C.emerald }}>
                    {totals.totalInv > 0 ? (totals.totalJobs / totals.totalInv).toFixed(1) : '0.0'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Employment generation efficiency</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((totals.totalJobs / totals.totalInv || 0) * 5, 100)}%`, background: C.emerald }} />
                </div>
              </div>

              {/* Capital Intensity */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Investment per Park</span>
                  <span className="text-sm font-extrabold" style={{ color: C.amber }}>₹{parks.length > 0 ? (totals.totalInv / parks.length).toFixed(1) : '0'} Cr</span>
                </div>
                <p className="text-xs text-slate-400">Avg. investment concentration across {parks.length} parks</p>
              </div>
            </div>
          </motion.div>

          {/* Map — col-span-8 */}
          <motion.div {...fadeUp(0.45)} className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Geospatial Industrial Map — Tamil Nadu</h2>
                <p className="text-xs text-slate-400">Live park status · Orange = Alert (&gt; 1,000 KLD)</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#003366] inline-block"/>Normal</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF9900] inline-block"/>Alert</span>
              </div>
            </div>
            <div className="flex-1">
              <ParkMap parks={parkMapData} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

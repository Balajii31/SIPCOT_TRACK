'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Droplets, Leaf, Building2,
  AlertTriangle, Download, RefreshCw,
} from 'lucide-react';
import { BrandHeader } from '@/components/BrandHeader';
import { UserNav } from '@/components/UserNav';
import dynamic from 'next/dynamic';
import type { ParkData } from '@/components/ParkMap';
import { generateAdminPDF } from '@/lib/adminPdfExport';

const ParkMap = dynamic(() => import('@/components/ParkMap'), { ssr: false });

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  navy:    '#003366',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  slate:   '#64748B',
};

// ── Mock Data (follows schema) ────────────────────────────────────────────────
const MONTHLY = [
  { month:'Apr',investment:820, employment:18200,water:6200,csr:24},
  { month:'May',investment:910, employment:19100,water:6800,csr:28},
  { month:'Jun',investment:870, employment:18700,water:7100,csr:22},
  { month:'Jul',investment:980, employment:20400,water:6900,csr:31},
  { month:'Aug',investment:1050,employment:21800,water:7400,csr:35},
  { month:'Sep',investment:990, employment:21000,water:7000,csr:29},
  { month:'Oct',investment:1120,employment:22500,water:7600,csr:38},
  { month:'Nov',investment:1080,employment:22000,water:7300,csr:36},
  { month:'Dec',investment:1200,employment:23800,water:8100,csr:42},
  { month:'Jan',investment:1150,employment:23000,water:7900,csr:40},
  { month:'Feb',investment:1300,employment:24500,water:8400,csr:45},
  { month:'Mar',investment:1420,employment:25800,water:8900,csr:51},
];

const SECTORS = [
  { name:'Automobile',  value:38, color:'#003366' },
  { name:'IT/Electronics', value:24, color:'#10B981' },
  { name:'Pharma',      value:19, color:'#F59E0B' },
  { name:'Textiles',    value:12, color:'#8B5CF6' },
  { name:'Others',      value:7,  color:'#94A3B8' },
];

const PARKS_MAP: ParkData[] = [
  { id:'p1', name:'Hosur I',          lat:12.7409, lng:77.8253, water_kld:1240, investment_cr:4500, total_jobs:28500 },
  { id:'p2', name:'Hosur II',         lat:12.7209, lng:77.8353, water_kld:820,  investment_cr:3200, total_jobs:19800 },
  { id:'p3', name:'Sriperumbudur',    lat:12.9694, lng:79.9481, water_kld:1560, investment_cr:7800, total_jobs:42000 },
  { id:'p4', name:'Oragadam',         lat:12.8230, lng:79.9866, water_kld:680,  investment_cr:5600, total_jobs:35000 },
  { id:'p5', name:'Coimbatore SIDCO', lat:11.0168, lng:76.9558, water_kld:430,  investment_cr:1800, total_jobs:12000 },
  { id:'p6', name:'Madurai',          lat:9.9252,  lng:78.1198, water_kld:290,  investment_cr:960,  total_jobs:7800  },
  { id:'p7', name:'Gummidipoondi',    lat:13.4070, lng:80.1195, water_kld:1100, investment_cr:2900, total_jobs:16500 },
  { id:'p8', name:'Ranipet',          lat:12.9298, lng:79.3334, water_kld:375,  investment_cr:1450, total_jobs:9200  },
  { id:'p9', name:'Cuddalore',        lat:11.7447, lng:79.7681, water_kld:2100, investment_cr:6200, total_jobs:31000 },
  { id:'p10',name:'Perundurai',       lat:11.2762, lng:77.5806, water_kld:540,  investment_cr:2100, total_jobs:14200 },
];

const WATER_ALERTS = PARKS_MAP.filter(p => p.water_kld > 1000);

const SPARKLINE = [42,45,40,50,48,55,58,54,60,62,59,65];

// Employment breakdown for Gender Parity
const EMP = { male:14200, female:7800, contractual:3800 };
const EMP_TOTAL = EMP.male + EMP.female + EMP.contractual;

// ── Helper calcs ──────────────────────────────────────────────────────────────
const latest = MONTHLY[MONTHLY.length - 1];
const prev    = MONTHLY[MONTHLY.length - 2];
const totalInvestment = MONTHLY.reduce((s,m) => s + m.investment, 0);
const totalWater      = latest.water;
const totalCSR        = MONTHLY.reduce((s,m) => s + m.csr, 0);
const waterEfficiency = ((latest.investment * 100) / latest.water).toFixed(1);
const genderParity    = ((EMP.female / EMP_TOTAL) * 100).toFixed(1);
const capitalIntensity= ((totalInvestment * 10) / latest.employment).toFixed(2); // ₹L per employee

function pct(a: number, b: number) {
  return (((a - b) / b) * 100).toFixed(1);
}

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' },
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
  const up = !trend.startsWith('-');
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
        <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend}%
        </span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-800">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
      <Sparkline data={sparkData} />
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
      <p className="text-[#003366]">Investment: <strong>₹{inv} Cr</strong></p>
      <p className="text-emerald-600">Employment: <strong>{emp.toLocaleString()}</strong></p>
      <p className="text-amber-600 mt-1 border-t border-slate-100 pt-1">
        Inv/Employee: <strong>₹{((inv * 10000000) / emp).toFixed(0)}</strong>
      </p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeSlice, setActiveSlice] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateAdminPDF();
    } finally {
      setExporting(false);
    }
  };

  const sparkTrends = MONTHLY.map(m => m.investment);

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
            value={`₹${totalInvestment.toLocaleString()} Cr`} sub="Cumulative FY 2024-25"
            trend={pct(latest.investment, prev.investment)} sparkData={sparkTrends} color={C.navy} />
          <KPICard icon={Users}       title="Workforce"          delay={0.10}
            value={latest.employment.toLocaleString()} sub="Direct + Contractual"
            trend={pct(latest.employment, prev.employment)} sparkData={MONTHLY.map(m=>m.employment/100)} color={C.emerald} />
          <KPICard icon={Droplets}    title="Water Consumption"  delay={0.15}
            value={`${totalWater.toLocaleString()} KLD`} sub="State-wide daily usage"
            trend={pct(latest.water, prev.water)} sparkData={MONTHLY.map(m=>m.water/100)} color={C.amber} />
          <KPICard icon={Leaf}        title="CSR Spend"          delay={0.20}
            value={`₹${totalCSR} L`} sub="FY 2024-25 total"
            trend={pct(latest.csr, prev.csr)} sparkData={MONTHLY.map(m=>m.csr)} color="#8B5CF6" />
        </div>

        {/* ── II. Intelligence Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Composed Chart — col-span-8 */}
          <motion.div {...fadeUp(0.2)} className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Investment vs Employment Trend</h2>
                <p className="text-xs text-slate-400">12-month performance · Bars = Investment · Line = Jobs</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={MONTHLY} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
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
            <p className="text-xs text-slate-400 mb-4">Click a slice to drill down</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={SECTORS} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}
                  onClick={(d) => { setActiveSlice(d.name); console.log('Sector:', d.name); }}>
                  {SECTORS.map((s) => (
                    <Cell key={s.name} fill={s.color}
                      opacity={activeSlice && activeSlice !== s.name ? 0.4 : 1}
                      stroke={activeSlice === s.name ? '#fff' : 'none'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {SECTORS.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs cursor-pointer"
                  onClick={() => { setActiveSlice(s.name === activeSlice ? null : s.name); }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: s.color }} />
                    <span className={`font-medium ${activeSlice === s.name ? 'text-slate-800' : 'text-slate-500'}`}>{s.name}</span>
                  </div>
                  <span className="font-bold text-slate-700">{s.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── III. Resource Stress ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Gauges */}
          <motion.div {...fadeUp(0.3)} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 text-sm mb-4">Resource Stress Gauges</h2>
            <div className="flex justify-around">
              <SemiGauge label="Water Usage" value={totalWater} capacity={10000} unit="KLD" />
              <SemiGauge label="Power Usage" value={284000} capacity={320000} unit="kWh" />
            </div>
          </motion.div>

          {/* Water Alert Table */}
          <motion.div {...fadeUp(0.35)} className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-red-500" />
              <h2 className="font-bold text-slate-800 text-sm">Water Alert Parks (&gt;1,000 KLD)</h2>
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {WATER_ALERTS.length} parks
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Park','District','Water (KLD)','Jobs','Investment (Cr)','Status'].map(h => (
                    <th key={h} className="text-left py-2 text-slate-400 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {WATER_ALERTS.map(p => {
                  const crit = p.water_kld > 1800;
                  return (
                    <tr key={p.id} className={`${crit ? 'bg-red-50' : 'bg-amber-50/40'}`}>
                      <td className="py-2.5 font-semibold text-slate-800 pr-4">{p.name}</td>
                      <td className="py-2.5 text-slate-500">—</td>
                      <td className="py-2.5">
                        <span className={`font-bold ${crit ? 'text-red-600' : 'text-amber-600'}`}>
                          {p.water_kld.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">{p.total_jobs.toLocaleString()}</td>
                      <td className="py-2.5 text-slate-600">₹{p.investment_cr.toLocaleString()}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${crit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {crit ? '🔴 Critical' : '🟡 High'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </div>

        {/* ── IV. Advanced Analytics ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Analytics cards */}
          <motion.div {...fadeUp(0.4)} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 text-sm mb-4">Advanced Analytics</h2>
            <div className="space-y-4">
              {/* Water Efficiency Index */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Water Efficiency Index</span>
                  <span className="text-sm font-extrabold text-navy-700" style={{ color: C.navy }}>{waterEfficiency}</span>
                </div>
                <p className="text-xs text-slate-400">Turnover ÷ Water Consumed · Higher = Better</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#003366] rounded-full" style={{ width: `${Math.min(parseFloat(waterEfficiency)/2, 100)}%` }} />
                </div>
              </div>

              {/* Gender Parity Score */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Gender Parity Score</span>
                  <span className="text-sm font-extrabold" style={{ color: C.emerald }}>{genderParity}%</span>
                </div>
                <div className="flex text-xs text-slate-400 gap-4 mb-2">
                  <span>♂ {EMP.male.toLocaleString()}</span>
                  <span>♀ {EMP.female.toLocaleString()}</span>
                  <span>C {EMP.contractual.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${genderParity}%`, background: C.emerald }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">Standard target: 30%</p>
              </div>

              {/* Capital Intensity */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Capital Intensity</span>
                  <span className="text-sm font-extrabold" style={{ color: C.amber }}>₹{capitalIntensity}L</span>
                </div>
                <p className="text-xs text-slate-400">Investment per Employee · FY 2024-25</p>
              </div>
            </div>
          </motion.div>

          {/* Map — col-span-8 */}
          <motion.div {...fadeUp(0.45)} className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Park Locations — Tamil Nadu</h2>
                <p className="text-xs text-slate-400">Orange = Water &gt; 1,000 KLD</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#003366] inline-block"/>Normal</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF9900] inline-block"/>Alert</span>
              </div>
            </div>
            <ParkMap parks={PARKS_MAP} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

'use client';

// Force dynamic rendering — prevents Vercel build prerender crash
// (Supabase client requires env vars only available at runtime)
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BrandHeader } from '@/components/BrandHeader';
import { supabase, type VerificationItem, type ReportStatus } from '@/lib/supabase';

type FilterType = 'all' | ReportStatus;

function StatusBadge({ status }: { status: ReportStatus }) {
  const map: Record<ReportStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MonthName({ month }: { month: number }) {
  return <>{new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}</>;
}

export default function AdminVerifyPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('verification_queue')
        .select('*');
      if (error) throw error;
      setItems(data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approved' | 'rejected') {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('monthly_reports')
        .update({
          status: action,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, status: action } : item))
      );

      if (action === 'approved') {
        toast.success('Report approved successfully.');
      } else {
        toast.error('Report rejected.');
      }
    } catch (err: any) {
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const countByStatus = (s: ReportStatus) => items.filter(i => i.status === s).length;
  const pendingCount = countByStatus('pending');

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BrandHeader
        subtitle="Verification Queue"
        rightContent={
          <>
            <Link href="/admin/dashboard" className="text-white/80 hover:text-white text-sm transition-colors">
              ← Map Dashboard
            </Link>
            <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors">
              Home
            </Link>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#003366]">Verification Queue</h1>
            <p className="text-gray-500 text-sm mt-1">
              Review and approve industry monthly data submissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="bg-[#FF9900]/10 border border-[#FF9900]/40 rounded-xl px-5 py-3 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9900] animate-pulse" />
                <span className="text-[#FF9900] font-bold text-sm">{pendingCount} pending review</span>
              </div>
            )}
            <button
              onClick={loadQueue}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-[#003366] hover:text-[#003366] transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 text-sm text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === f
                  ? 'bg-[#003366] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#003366] hover:text-[#003366]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-2 text-xs opacity-70">({countByStatus(f as ReportStatus)})</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#003366] text-white text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4 text-left">Industry</th>
                <th className="px-4 py-4 text-left">Period</th>
                <th className="px-4 py-4 text-right">Investment (Cr)</th>
                <th className="px-4 py-4 text-right">Jobs</th>
                <th className="px-4 py-4 text-right">Water (KLD)</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-28" />
                    </td>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-100 rounded w-16 mx-auto" />
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded w-20 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <p className="text-gray-400 text-sm">
                      {filter === 'all'
                        ? 'No submissions yet. Reports submitted by industries will appear here.'
                        : `No ${filter} submissions.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className="hover:bg-[#003366]/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 text-sm">{item.industry_name}</p>
                        <p className="text-xs text-gray-400">{item.park_name} · {item.district}</p>
                        {item.allottee_code && (
                          <p className="text-xs text-gray-400 font-mono">{item.allottee_code}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <MonthName month={item.month} /> {item.year}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-gray-800">
                        {item.investment_cr != null ? `₹${item.investment_cr.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">
                        {item.emp_total?.toLocaleString('en-IN') ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-semibold ${item.water_alert ? 'text-[#FF9900]' : 'text-gray-700'}`}>
                          {item.water_kld != null ? item.water_kld.toLocaleString('en-IN') : '—'}
                          {item.water_alert && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); handleAction(item.id, 'approved'); }}
                              disabled={actionLoading === item.id}
                              className="px-4 py-1.5 bg-[#003366] text-white text-xs font-bold rounded-lg hover:bg-[#004d99] transition-colors disabled:opacity-50"
                            >
                              {actionLoading === item.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleAction(item.id, 'rejected'); }}
                              disabled={actionLoading === item.id}
                              className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 block text-center">
                            {item.verified_at
                              ? new Date(item.verified_at).toLocaleDateString('en-IN')
                              : '—'}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expanded === item.id && (
                      <tr key={`${item.id}-detail`} className="bg-[#003366]/5">
                        <td colSpan={7} className="px-8 py-5">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                              { label: 'Investment', value: item.investment_cr != null ? `₹${item.investment_cr.toLocaleString('en-IN')} Cr` : '—' },
                              { label: 'Turnover', value: item.turnover_cr != null ? `₹${item.turnover_cr.toLocaleString('en-IN')} Cr` : '—' },
                              { label: 'Employment', value: item.emp_total?.toLocaleString('en-IN') ?? '—', sub: `♂${item.emp_male} ♀${item.emp_female} C${item.emp_contractual}` },
                              { label: 'Water Usage', value: item.water_kld != null ? `${item.water_kld.toLocaleString('en-IN')} KLD` : '—', alert: item.water_alert },
                              { label: 'Power Usage', value: item.power_kwh != null ? `${item.power_kwh.toLocaleString('en-IN')} kWh` : '—' },
                              { label: 'CSR Spend', value: item.csr_spend_lakhs != null ? `₹${item.csr_spend_lakhs} Lakhs` : '—' },
                            ].map(d => (
                              <div key={d.label} className="bg-white rounded-xl p-4 shadow-sm">
                                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{d.label}</p>
                                <p className={`text-sm font-extrabold ${d.alert ? 'text-[#FF9900]' : 'text-[#003366]'}`}>{d.value}</p>
                                {d.sub && <p className="text-xs text-gray-400 mt-0.5">{d.sub}</p>}
                              </div>
                            ))}
                          </div>
                          {item.csr_activity && (
                            <div className="mt-3 bg-white rounded-xl p-4 shadow-sm">
                              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">CSR Activity</p>
                              <p className="text-sm text-gray-700">{item.csr_activity}</p>
                            </div>
                          )}
                          {item.csr_file_url && (
                            <a
                              href={item.csr_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-[#003366] font-semibold hover:underline"
                            >
                              📎 View CSR Document
                            </a>
                          )}
                          {item.rejection_reason && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                              <p className="text-xs text-red-600 font-semibold">Rejection Reason: {item.rejection_reason}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-3">
                            Submitted: {new Date(item.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

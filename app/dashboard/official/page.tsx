'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BrandHeader } from '@/components/BrandHeader';
import { UserNav } from '@/components/UserNav';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DashboardStats {
  total_industries: number;
  total_reports: number;
  verified_reports: number;
  pending_reports: number;
}

export default function OfficialDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_industries: 0,
    total_reports: 0,
    verified_reports: 0,
    pending_reports: 0,
  });
  const [investmentTrend, setInvestmentTrend] = useState<any[]>([]);
  const [sectorBreakdown, setSectorBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Load stats
        const { data: industryData } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'industry')
          .eq('status', 'approved');

        const { data: reportData } = await supabase
          .from('monthly_reports')
          .select('*');

        if (industryData && reportData) {
          setStats({
            total_industries: industryData.length,
            total_reports: reportData.length,
            verified_reports: reportData.filter(r => r.status === 'verified').length,
            pending_reports: reportData.filter(r => r.status === 'submitted').length,
          });

          // Calculate investment trend
          const monthlyTrend = reportData
            .filter(r => r.status !== 'draft')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(-12)
            .map(r => ({
              month: `${r.month}/${r.year}`,
              investment: r.investment_amount || 0,
            }));

          setInvestmentTrend(monthlyTrend);

          // Calculate sector breakdown
          const { data: profiles } = await supabase
            .from('industry_profiles')
            .select('sector');

          if (profiles) {
            const sectorCounts = profiles.reduce((acc: any, p: any) => {
              acc[p.sector] = (acc[p.sector] || 0) + 1;
              return acc;
            }, {});

            const breakdown = Object.entries(sectorCounts).map(([sector, count]) => ({
              name: sector,
              value: count,
            }));

            setSectorBreakdown(breakdown);
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandHeader 
        subtitle="Industrial Monitoring" 
        rightContent={<UserNav />}
      />
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Official Dashboard</h1>
          <p className="text-muted-foreground">Monitor industrial performance and submissions</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Active Industries</div>
          <div className="text-3xl font-bold text-foreground">{stats.total_industries}</div>
          <p className="text-xs text-muted-foreground mt-2">Approved users</p>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Total Reports</div>
          <div className="text-3xl font-bold text-foreground">{stats.total_reports}</div>
          <p className="text-xs text-muted-foreground mt-2">All submissions</p>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Verified Reports</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.verified_reports}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Approved submissions</p>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Pending Verification</div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pending_reports}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Awaiting review</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Investment Trend</h2>
          {investmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={investmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="investment"
                  stroke="var(--color-primary)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data available</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Industry by Sector</h2>
          {sectorBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data available</p>
          )}
        </Card>
      </div>

      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <Link href="/dashboard/official/monitor">
            <Button>Monitor Industries</Button>
          </Link>
          <Link href="/dashboard/official/reports">
            <Button variant="outline">View All Reports</Button>
          </Link>
          <Link href="/dashboard/official/alerts">
            <Button variant="outline">Check Alerts</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

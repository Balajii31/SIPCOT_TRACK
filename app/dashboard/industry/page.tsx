'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ReportSummary {
  total_submitted: number;
  total_verified: number;
  last_submitted: string | null;
  current_status: string;
}

export default function IndustryDashboard() {
  const [summary, setSummary] = useState<ReportSummary>({
    total_submitted: 0,
    total_verified: 0,
    last_submitted: null,
    current_status: 'No reports',
  });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) return;

        // Load profile
        const { data: profileData } = await supabase
          .from('industry_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        setProfile(profileData);

        // Load report summary
        const { data: reports } = await supabase
          .from('monthly_reports')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (reports && reports.length > 0) {
          const submitted = reports.filter(r => r.status !== 'draft').length;
          const verified = reports.filter(r => r.status === 'verified').length;
          const lastSubmitted = reports.find(r => r.status !== 'draft')?.submitted_at;

          setSummary({
            total_submitted: submitted,
            total_verified: verified,
            last_submitted: lastSubmitted,
            current_status: verified > 0 ? 'Verified' : 'Submitted',
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Industry Dashboard</h1>
        {profile && (
          <p className="text-muted-foreground">
            {profile.company_name} • {profile.sector}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Reports Submitted</div>
          <div className="text-3xl font-bold text-foreground">{summary.total_submitted}</div>
          <p className="text-xs text-muted-foreground mt-2">Total monthly reports</p>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Verified Reports</div>
          <div className="text-3xl font-bold text-foreground">{summary.total_verified}</div>
          <p className="text-xs text-muted-foreground mt-2">Approved by official</p>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Account Status</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">Active</div>
          <p className="text-xs text-muted-foreground mt-2">Ready to submit</p>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Last Submission</div>
          <div className="text-sm font-bold text-foreground">
            {summary.last_submitted
              ? new Date(summary.last_submitted).toLocaleDateString()
              : 'None'}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Latest report date</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <Link href="/dashboard/industry/submit-report">
            <Button>Submit Monthly Report</Button>
          </Link>
          <Link href="/dashboard/industry/history">
            <Button variant="outline">View History</Button>
          </Link>
          <Link href="/dashboard/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

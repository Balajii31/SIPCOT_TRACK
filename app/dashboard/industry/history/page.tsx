'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Report {
  id: string;
  month: number;
  year: number;
  status: string;
  submitted_at: string | null;
  verified_at: string | null;
  investment_cr: number;
  emp_total: number;
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (searchParams.get('success') === 'submitted') {
      setSuccess('Report submitted successfully!');
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadReports() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Get user's industry first
        const { data: industry } = await supabase
          .from('industries')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!industry) {
          setReports([]);
          return;
        }

        const { data } = await supabase
          .from('monthly_reports')
          .select('*')
          .eq('industry_id', industry.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        setReports(data || []);
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'submitted':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'verified':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Report History</h1>
          <p className="text-muted-foreground">View all your submitted reports</p>
        </div>
        <Link href="/dashboard/industry/submit-report">
          <Button>Submit New Report</Button>
        </Link>
      </div>

      {success && (
        <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-md mb-6">
          {success}
        </div>
      )}

      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No reports submitted yet</p>
          <Link href="/dashboard/industry/submit-report">
            <Button>Submit Your First Report</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <Card key={report.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {new Date(2024, report.month - 1).toLocaleString('default', { month: 'long' })} {report.year}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(report.status)}`}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Investment</p>
                      <p className="font-medium text-foreground">₹{report.investment_cr != null ? `${report.investment_cr.toLocaleString('en-IN')} Cr` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Employment</p>
                      <p className="font-medium text-foreground">{report.emp_total != null ? `${report.emp_total} Persons` : 'N/A'}</p>
                    </div>
                  </div>

                  {report.submitted_at && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                    </p>
                  )}

                  {report.verified_at && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Verified: {new Date(report.verified_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="ml-4">
                  <Button variant="outline" size="sm" disabled>
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}

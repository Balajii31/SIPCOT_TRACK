'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ReportWithCompany {
  id: string;
  month: number;
  year: number;
  status: string;
  submitted_at: string | null;
  investment_cr: number;
  company_name: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportWithCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const { data: reportsData } = await supabase
          .from('monthly_reports')
          .select(`
            *,
            industries(name)
          `)
          .order('submitted_at', { ascending: false });

        const formatted = reportsData?.map((r: any) => ({
          ...r,
          company_name: r.industries?.name || 'Unknown',
        })) || [];

        setReports(formatted);
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
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">All Reports</h1>
      <p className="text-muted-foreground mb-8">Review submissions from all industries</p>

      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No reports submitted yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <Card key={report.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {report.company_name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(report.status)}`}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Period</p>
                      <p className="font-medium text-foreground">
                        {new Date(2024, report.month - 1).toLocaleString('default', { month: 'short' })} {report.year}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Investment</p>
                      <p className="font-medium text-foreground">₹{report.investment_cr != null ? `${report.investment_cr.toLocaleString('en-IN')} Cr` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium text-foreground">
                        {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {report.status === 'submitted' && (
                  <Button size="sm">
                    Verify
                  </Button>
                )}
                {report.status === 'verified' && (
                  <Button variant="outline" size="sm" disabled>
                    Verified
                  </Button>
                )}
                {report.status === 'draft' && (
                  <span className="text-xs text-muted-foreground">Draft</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

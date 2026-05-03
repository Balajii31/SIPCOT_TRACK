'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandHeader } from '@/components/BrandHeader';
import { UserNav } from '@/components/UserNav';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AdminStats {
  total_users: number;
  pending_approvals: number;
  total_reports: number;
  audit_logs: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    pending_approvals: 0,
    total_reports: 0,
    audit_logs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Load user stats
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, status');

        const { data: reports } = await supabase
          .from('monthly_reports')
          .select('id');

        const { data: logs } = await supabase
          .from('audit_logs')
          .select('id');

        if (allUsers) {
          setStats({
            total_users: allUsers.length,
            pending_approvals: allUsers.filter(u => u.status === 'pending').length,
            total_reports: reports?.length || 0,
            audit_logs: logs?.length || 0,
          });
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandHeader 
        subtitle="System Administration" 
        rightContent={<UserNav />}
      />
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">System administration and user management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Users</div>
            <div className="text-3xl font-bold text-foreground">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground mt-2">All registered users</p>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Pending Approvals</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.pending_approvals}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Awaiting review</p>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Reports</div>
            <div className="text-3xl font-bold text-foreground">{stats.total_reports}</div>
            <p className="text-xs text-muted-foreground mt-2">All submissions</p>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Audit Logs</div>
            <div className="text-3xl font-bold text-foreground">{stats.audit_logs}</div>
            <p className="text-xs text-muted-foreground mt-2">System activities</p>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Admin Controls</h2>
          <div className="flex gap-4 flex-wrap">
            <Link href="/dashboard/admin/users">
              <Button>Manage Users</Button>
            </Link>
            <Link href="/dashboard/admin/settings">
              <Button variant="outline">System Settings</Button>
            </Link>
            <Link href="/dashboard/admin/audit">
              <Button variant="outline">View Audit Logs</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { supabase, recordAuditLog } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  company_name: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId);

      if (!error) {
        await loadUsers();
        // ── Audit Log ─────────────────────────────────────────────────────────
        await recordAuditLog({
          action: 'user.approved',
          entity_type: 'user',
          entity_id: userId,
          old_values: { status: 'pending' },
          new_values: { status: 'active' },
        });
      }
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', userId);

      if (!error) {
        await loadUsers();
        // ── Audit Log ─────────────────────────────────────────────────────────
        await recordAuditLog({
          action: 'user.rejected',
          entity_type: 'user',
          entity_id: userId,
          old_values: { status: 'pending' },
          new_values: { status: 'rejected' },
        });
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'active':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'industry':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'official':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-400';
      case 'admin':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
      <p className="text-muted-foreground mb-8">Manage system users and approvals</p>

      {users.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No users registered yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map(user => (
            <Card key={user.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {user.full_name || 'Unnamed User'}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Company</p>
                      <p className="font-medium text-foreground">{user.company_name || 'N/A'}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Registered: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                {user.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleApproveUser(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectUser(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

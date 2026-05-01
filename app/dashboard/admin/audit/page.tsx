'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user_email?: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const { data: logsData } = await supabase
          .from('audit_logs')
          .select(`
            *,
            users!user_id(email)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        const formatted = logsData?.map((log: any) => ({
          ...log,
          user_email: log.users?.email || 'System',
        })) || [];

        setLogs(formatted);
      } catch (error) {
        console.error('Error loading audit logs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('insert')) {
      return 'text-green-600 dark:text-green-400';
    } else if (action.includes('delete')) {
      return 'text-destructive';
    } else if (action.includes('update')) {
      return 'text-blue-600 dark:text-blue-400';
    }
    return 'text-muted-foreground';
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Audit Logs</h1>
      <p className="text-muted-foreground mb-8">System activity and change history</p>

      {logs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No audit logs available</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`font-semibold ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    {log.entity_type && (
                      <span className="text-sm bg-muted text-muted-foreground px-2 py-1 rounded">
                        {log.entity_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    User: {log.user_email}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(log.created_at).toLocaleDateString()}</p>
                  <p>{new Date(log.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

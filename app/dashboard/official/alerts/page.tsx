'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Alert {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read_at: string | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        setAlerts(data || []);
      } catch (error) {
        console.error('Error loading alerts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'submission_reminder':
        return '📋';
      case 'threshold_alert':
        return '⚠️';
      case 'system':
        return 'ℹ️';
      default:
        return '📌';
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Notifications & Alerts</h1>
      <p className="text-muted-foreground mb-8">Track system alerts and important notifications</p>

      {alerts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No alerts at this time</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <Card
              key={alert.id}
              className={`p-6 ${!alert.read_at ? 'border-primary border-2' : 'border-border'}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">{getAlertIcon(alert.type)}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{alert.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(alert.created_at).toLocaleDateString()}{' '}
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {!alert.read_at && (
                  <div className="w-3 h-3 rounded-full bg-primary mt-1"></div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

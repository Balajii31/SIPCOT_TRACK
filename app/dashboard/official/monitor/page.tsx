'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Industry {
  id: string;
  company_name: string;
  sector: string;
  location: string;
  user_id: string;
}

export default function MonitorPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIndustries() {
      try {
        const { data } = await supabase
          .from('industry_profiles')
          .select('*')
          .order('company_name');

        setIndustries(data || []);
      } catch (error) {
        console.error('Error loading industries:', error);
      } finally {
        setLoading(false);
      }
    }

    loadIndustries();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Monitor Industries</h1>
      <p className="text-muted-foreground mb-8">Track all registered industries and their performance</p>

      {industries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No industries registered yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {industries.map(industry => (
            <Card key={industry.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {industry.company_name}
                  </h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{industry.sector}</span>
                    <span>{industry.location}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

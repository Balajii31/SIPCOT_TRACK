'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SECTORS = [
  'Chemicals',
  'Petrochemicals',
  'Steel',
  'Refinery',
  'Textiles',
  'Paper & Pulp',
  'Cement',
  'Automobiles',
  'Pharmaceuticals',
  'Electronics',
  'Heavy Equipment',
  'Other',
];

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newThreshold, setNewThreshold] = useState({
    sector: '',
    metric_name: 'investment',
    min_value: '',
    max_value: '',
  });

  useEffect(() => {
    loadThresholds();
  }, []);

  async function loadThresholds() {
    try {
      const { data } = await supabase
        .from('thresholds')
        .select('*')
        .order('sector');

      setThresholds(data || []);
    } catch (error) {
      console.error('Error loading thresholds:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddThreshold = async () => {
    if (!newThreshold.sector || !newThreshold.min_value || !newThreshold.max_value) {
      alert('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('thresholds')
        .insert([
          {
            sector: newThreshold.sector,
            metric_name: newThreshold.metric_name,
            min_value: parseFloat(newThreshold.min_value),
            max_value: parseFloat(newThreshold.max_value),
          },
        ]);

      if (!error) {
        setNewThreshold({
          sector: '',
          metric_name: 'investment',
          min_value: '',
          max_value: '',
        });
        await loadThresholds();
      }
    } catch (error) {
      console.error('Error adding threshold:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteThreshold = async (id: string) => {
    try {
      const { error } = await supabase
        .from('thresholds')
        .delete()
        .eq('id', id);

      if (!error) {
        await loadThresholds();
      }
    } catch (error) {
      console.error('Error deleting threshold:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">System Settings</h1>
      <p className="text-muted-foreground mb-8">Configure system parameters and thresholds</p>

      <Card className="p-8 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Add Performance Threshold</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sector" className="text-foreground">
                Sector
              </Label>
              <Select
                value={newThreshold.sector}
                onValueChange={(value) =>
                  setNewThreshold({ ...newThreshold, sector: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(sector => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="metric" className="text-foreground">
                Metric
              </Label>
              <Select
                value={newThreshold.metric_name}
                onValueChange={(value) =>
                  setNewThreshold({ ...newThreshold, metric_name: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="employment">Employment</SelectItem>
                  <SelectItem value="water">Water Consumption</SelectItem>
                  <SelectItem value="power">Power Consumption</SelectItem>
                  <SelectItem value="turnover">Annual Turnover</SelectItem>
                  <SelectItem value="csr">CSR Spending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min" className="text-foreground">
                Minimum Value
              </Label>
              <Input
                id="min"
                type="number"
                step="0.01"
                value={newThreshold.min_value}
                onChange={(e) =>
                  setNewThreshold({ ...newThreshold, min_value: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="max" className="text-foreground">
                Maximum Value
              </Label>
              <Input
                id="max"
                type="number"
                step="0.01"
                value={newThreshold.max_value}
                onChange={(e) =>
                  setNewThreshold({ ...newThreshold, max_value: e.target.value })
                }
                className="mt-2"
              />
            </div>
          </div>

          <Button onClick={handleAddThreshold} disabled={saving} className="w-full">
            {saving ? 'Adding...' : 'Add Threshold'}
          </Button>
        </div>
      </Card>

      <Card className="p-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Current Thresholds</h2>

        {thresholds.length === 0 ? (
          <p className="text-muted-foreground">No thresholds configured yet</p>
        ) : (
          <div className="space-y-4">
            {thresholds.map(threshold => (
              <div key={threshold.id} className="flex items-center justify-between p-4 border border-border rounded-md">
                <div>
                  <p className="font-semibold text-foreground">{threshold.sector}</p>
                  <p className="text-sm text-muted-foreground">
                    {threshold.metric_name}: {threshold.min_value} - {threshold.max_value}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteThreshold(threshold.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

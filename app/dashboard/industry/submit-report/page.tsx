'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
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

export default function SubmitReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    investment_amount: '',
    employment_count: '',
    water_consumption: '',
    power_consumption: '',
    annual_turnover: '',
    csr_spending: '',
  });

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    loadUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || '' }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!userId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    try {
      // Check if report already exists for this month/year
      const { data: existing } = await supabase
        .from('monthly_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('month', formData.month)
        .eq('year', formData.year)
        .single();

      const reportData = {
        user_id: userId,
        month: formData.month,
        year: formData.year,
        investment_amount: formData.investment_amount ? parseFloat(formData.investment_amount) : null,
        employment_count: formData.employment_count ? parseInt(formData.employment_count) : null,
        water_consumption: formData.water_consumption ? parseFloat(formData.water_consumption) : null,
        power_consumption: formData.power_consumption ? parseFloat(formData.power_consumption) : null,
        annual_turnover: formData.annual_turnover ? parseFloat(formData.annual_turnover) : null,
        csr_spending: formData.csr_spending ? parseFloat(formData.csr_spending) : null,
        status: isDraft ? 'draft' : 'submitted',
        submitted_at: isDraft ? null : new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('monthly_reports')
          .update(reportData)
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('monthly_reports')
          .insert([reportData]);

        if (insertError) throw insertError;
      }

      if (isDraft) {
        setError('Report saved as draft');
      } else {
        router.push('/dashboard/industry/history?success=submitted');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Submit Monthly Report</h1>
      <p className="text-muted-foreground mb-8">Enter your industrial performance metrics</p>

      {error && (
        <div className={`mb-6 p-4 rounded-md ${
          error.includes('saved') 
            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {error}
        </div>
      )}

      <Card className="p-8">
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month" className="text-foreground">
                Month
              </Label>
              <Select
                value={formData.month.toString()}
                onValueChange={(value) => handleSelectChange('month', value)}
                disabled={loading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year" className="text-foreground">
                Year
              </Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => handleSelectChange('year', value)}
                disabled={loading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="investment_amount" className="text-foreground">
              Investment Amount (₹)
            </Label>
            <Input
              id="investment_amount"
              name="investment_amount"
              type="number"
              step="0.01"
              value={formData.investment_amount}
              onChange={handleChange}
              className="mt-2"
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="employment_count" className="text-foreground">
              Employment Count
            </Label>
            <Input
              id="employment_count"
              name="employment_count"
              type="number"
              value={formData.employment_count}
              onChange={handleChange}
              className="mt-2"
              disabled={loading}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="water_consumption" className="text-foreground">
              Water Consumption (ML)
            </Label>
            <Input
              id="water_consumption"
              name="water_consumption"
              type="number"
              step="0.01"
              value={formData.water_consumption}
              onChange={handleChange}
              className="mt-2"
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="power_consumption" className="text-foreground">
              Power Consumption (MWh)
            </Label>
            <Input
              id="power_consumption"
              name="power_consumption"
              type="number"
              step="0.01"
              value={formData.power_consumption}
              onChange={handleChange}
              className="mt-2"
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="annual_turnover" className="text-foreground">
              Annual Turnover (₹)
            </Label>
            <Input
              id="annual_turnover"
              name="annual_turnover"
              type="number"
              step="0.01"
              value={formData.annual_turnover}
              onChange={handleChange}
              className="mt-2"
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="csr_spending" className="text-foreground">
              CSR Spending (₹)
            </Label>
            <Input
              id="csr_spending"
              name="csr_spending"
              type="number"
              step="0.01"
              value={formData.csr_spending}
              onChange={handleChange}
              className="mt-2"
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              className="flex-1"
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/auth';
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

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'industry' as const,
    companyName: '',
    companySector: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as 'industry' | 'official' | 'admin' }));
  };

  const handleSectorChange = (value: string) => {
    setFormData(prev => ({ ...prev, companySector: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.role === 'industry' && !formData.companySector) {
      setError('Please select a company sector');
      setLoading(false);
      return;
    }

    const result = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.role,
      formData.companySector,
      formData.companyName
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/login?signup=success');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border border-border p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">SIPCOT</h1>
          <p className="text-muted-foreground mb-8">Industrial Data Management System</p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-foreground">
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="mt-2"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-2"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-2"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-2"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-foreground">
                User Type
              </Label>
              <Select value={formData.role} onValueChange={handleRoleChange} disabled={loading}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="industry">Industry User</SelectItem>
                  <SelectItem value="official">Official</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'industry' && (
              <>
                <div>
                  <Label htmlFor="companyName" className="text-foreground">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="mt-2"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="companySector" className="text-foreground">
                    Sector
                  </Label>
                  <Select
                    value={formData.companySector}
                    onValueChange={handleSectorChange}
                    disabled={loading}
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
              </>
            )}

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

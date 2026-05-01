'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import type { User } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile: User = {
          id: 'mock-user-id',
          email: 'admin@example.com',
          full_name: 'Mock Admin',
          role: 'admin',
          company_name: 'Mock Company',
          company_sector: 'Technology',
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(profile);
        
        // Route to appropriate dashboard based on role
        if (window.location.pathname === '/dashboard') {
          if (profile.role === 'industry') {
            router.push('/dashboard/industry');
          } else if (profile.role === 'official') {
            router.push('/dashboard/official');
          } else if (profile.role === 'admin') {
            router.push('/dashboard/admin');
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {user && <Sidebar user={user} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {user && <Header user={user} />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

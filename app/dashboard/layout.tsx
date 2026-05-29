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
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authUser && !authError) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profileData && !profileError) {
            const profile: any = {
              id: profileData.id,
              email: profileData.email,
              full_name: profileData.full_name || 'Allottee User',
              role: profileData.role,
              company_name: profileData.industry_name || 'N/A',
              company_sector: profileData.district || 'N/A',
              status: profileData.status,
              created_at: profileData.created_at,
              updated_at: profileData.updated_at,
            };

            setUser(profile);

            // Client-side route-role authorization checks
            const currentPath = window.location.pathname;
            if (profile.status === 'pending') {
              if (currentPath !== '/unauthorized' || !window.location.search.includes('reason=pending')) {
                router.push('/unauthorized?reason=pending');
                return;
              }
            } else {
              if (currentPath.startsWith('/dashboard/admin') && profile.role !== 'admin') {
                router.push('/unauthorized?reason=role');
                return;
              }
              if (currentPath.startsWith('/dashboard/official') && profile.role !== 'official') {
                router.push('/unauthorized?reason=role');
                return;
              }
              if (currentPath.startsWith('/dashboard/industry') && profile.role !== 'industry') {
                router.push('/unauthorized?reason=role');
                return;
              }
            }

            // Route to appropriate dashboard based on role
            if (currentPath === '/dashboard') {
              if (profile.role === 'industry') {
                router.push('/dashboard/industry');
              } else if (profile.role === 'official') {
                router.push('/dashboard/official');
              } else if (profile.role === 'admin') {
                router.push('/dashboard/admin');
              }
            }
            return;
          }
        }

        // If not authenticated, redirect to login
        router.push('/login');
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/login');
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

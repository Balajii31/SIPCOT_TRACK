'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type UserRole } from '@/lib/supabase';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackUrl?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallbackUrl = '/unauthorized?reason=role',
}: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .single();

        if (!profile) {
          router.push('/login');
          return;
        }

        if (profile.status === 'pending') {
          router.push('/unauthorized?reason=pending');
          return;
        }

        if (!allowedRoles.includes(profile.role)) {
          router.push(fallbackUrl);
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error('Error in RoleGuard:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [router, allowedRoles, fallbackUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}

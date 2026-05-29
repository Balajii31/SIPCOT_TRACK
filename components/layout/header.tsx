'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ChevronDown, LogOut, ChevronLeft, User as UserIcon } from 'lucide-react';
import type { User } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear manual cookie
      document.cookie = `sb-iafcqhltfsrkzyipooha-auth-token=; path=/; max-age=0; SameSite=Lax`;
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get dynamic page title based on path
  const getSubtitle = () => {
    if (pathname.includes('/dashboard/admin/users')) return 'User Management';
    if (pathname.includes('/dashboard/admin/forms')) return 'Custom Forms';
    if (pathname.includes('/dashboard/admin/audit')) return 'Audit Logs';
    if (pathname.includes('/dashboard/admin/settings')) return 'Settings';
    if (pathname.includes('/dashboard/admin')) return 'Admin Overview';
    if (pathname.includes('/dashboard/official/monitor')) return 'Industry Monitoring';
    if (pathname.includes('/dashboard/official/reports')) return 'Filing Approvals';
    if (pathname.includes('/dashboard/official/alerts')) return 'Compliance Alerts';
    if (pathname.includes('/dashboard/official')) return 'Official Verification';
    if (pathname.includes('/dashboard/industry/submit-report')) return 'Industry Data Submission';
    if (pathname.includes('/dashboard/industry/history')) return 'Filing History';
    if (pathname.includes('/dashboard/industry')) return 'Industry Portal';
    if (pathname.includes('/dashboard/profile')) return 'Authorized Officer Profile';
    if (pathname.includes('/admin/dashboard')) return 'Geospatial Map Dashboard';
    return 'Portal Dashboard';
  };

  return (
    <header className="bg-[#003366] text-white px-8 py-3 flex items-center justify-between shadow-lg z-30">
      <div className="flex items-center gap-3 h-11">
        <span className="font-extrabold text-lg tracking-wide leading-tight text-white/90">
          {getSubtitle()}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white/80 hover:text-[#FF9900] text-sm font-semibold transition-colors bg-transparent border-0 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
          >
            <div className="w-7 h-7 rounded-full bg-[#FF9900] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left mr-1">
              <p className="text-[11px] font-bold text-white leading-none">
                {user.full_name || 'User'}
              </p>
              <p className="text-[9px] text-white/60 leading-none mt-0.5 uppercase tracking-tighter">
                {user.role}
              </p>
            </div>
            <ChevronDown size={14} className={`text-white/40 group-hover:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.full_name}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                </div>
                
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-slate-100"
                >
                  <UserIcon size={16} />
                  My Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

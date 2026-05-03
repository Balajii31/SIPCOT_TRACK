'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { User, LogOut, ChevronDown, Loader2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function UserNav() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ email: string; full_name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('email, full_name, role')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear the manual cookie
    document.cookie = `sb-iafcqhltfsrkzyipooha-auth-token=; path=/; max-age=0; SameSite=Lax`;
    router.push('/login');
    router.refresh();
  };

  if (loading) return <Loader2 className="w-5 h-5 text-white/50 animate-spin" />;
  if (!profile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
      >
        <div className="w-7 h-7 rounded-full bg-[#FF9900] flex items-center justify-center text-white font-bold text-xs shadow-sm">
          {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left mr-1">
          <p className="text-[11px] font-bold text-white leading-none">{profile.full_name || 'User'}</p>
          <p className="text-[9px] text-white/60 leading-none mt-0.5 uppercase tracking-tighter">{profile.role}</p>
        </div>
        <ChevronDown size={14} className={`text-white/40 group-hover:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-800 truncate">{profile.full_name}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{profile.email}</p>
            </div>
            
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
  );
}

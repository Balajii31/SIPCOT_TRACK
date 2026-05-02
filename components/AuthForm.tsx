'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  Building2, Shield, UserCog, Eye, EyeOff,
  Loader2, ChevronRight, Lock, Mail, User,
  MapPin, Briefcase, Hash,
} from 'lucide-react';
import { useEffect } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mode = 'login' | 'register';
type Role = 'industry' | 'official' | 'admin';

const ROLES: { id: Role; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'industry',  label: 'Industry Allottee', desc: 'Submit monthly compliance reports', icon: Building2, color: '#10B981' },
  { id: 'official',  label: 'SIPCOT Official',   desc: 'Verify and review submissions',     icon: Shield,    color: '#3B82F6' },
  { id: 'admin',     label: 'HQ Administrator',  desc: 'Full system access & analytics',    icon: UserCog,   color: '#8B5CF6' },
];

const REDIRECT: Record<Role, string> = {
  industry: '/allottee/update',
  official: '/admin/verify',
  admin:    '/admin/dashboard',
};

export default function AuthForm({ defaultMode = 'login' }: { defaultMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode]           = useState<Mode>(defaultMode);
  const [role, setRole]           = useState<Role>('industry');
  const [showPassword, setShowPw] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [form, setForm] = useState({
    email: '', password: '', fullName: '',
    industryName: '', allotteeCode: '',
    district: '', department: '',
  });

  // ── Auth Sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const { access_token, refresh_token } = session;
        const cookieValue = JSON.stringify([access_token, refresh_token]);
        document.cookie = `sb-iafcqhltfsrkzyipooha-auth-token=${encodeURIComponent(cookieValue)}; path=/; max-age=3600; SameSite=Lax`;
      } else {
        document.cookie = `sb-iafcqhltfsrkzyipooha-auth-token=; path=/; max-age=0; SameSite=Lax`;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    setLoadingMsg('Verifying Credentials & Role...');

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    });

    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Login failed'); setLoading(false); return;
    }

    setLoadingMsg('Fetching Access Level...');

    // Fetch role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      setError('Profile not found. Please contact support.'); setLoading(false); return;
    }

    if (profile.status === 'pending') {
      setError('Your account is pending approval by a SIPCOT administrator.');
      await supabase.auth.signOut(); setLoading(false); return;
    }

    setLoadingMsg('Redirecting to your dashboard...');
    // Small delay to ensure cookie is set
    setTimeout(() => {
      router.push(REDIRECT[profile.role as Role] ?? '/');
    }, 500);
  };

  // ── Register ─────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    setLoadingMsg('Creating your account...');

    const meta: Record<string, string> = {
      full_name: form.fullName,
      role,
      ...(role === 'industry'  && { industry_name: form.industryName, allottee_code: form.allotteeCode }),
      ...(role === 'official'  && { district: form.district, department: form.department }),
    };

    const { data, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: meta },
    });

    if (authErr) { setError(authErr.message); setLoading(false); return; }

    // Also upsert extra fields into profiles (trigger covers base fields)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id:            data.user.id,
        email:         form.email,
        full_name:     form.fullName,
        role,
        status:        role === 'industry' ? 'active' : 'pending',
        industry_name: form.industryName || null,
        allottee_code: form.allotteeCode || null,
        district:      form.district     || null,
        department:    form.department   || null,
      });
    }

    setLoading(false);
    if (role === 'industry') {
      setSuccess('Account created! Redirecting...');
      setTimeout(() => router.push(REDIRECT.industry), 1200);
    } else {
      setSuccess('Registration submitted. A SIPCOT administrator will review and activate your account.');
    }
  };

  const selectedRole = ROLES.find(r => r.id === role)!;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)' }}>

      {/* Background shimmer */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 60%)',
      }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>

        {/* Gov Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.3)',
            borderRadius: 8, padding: '6px 16px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: '#FF9900' }}>
              GOVERNMENT OF TAMIL NADU
            </span>
          </div>
          <h1 style={{ color: '#F8FAFC', fontSize: 26, fontWeight: 800, margin: 0 }}>SIPCOT TRACK</h1>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: '4px 0 0' }}>
            Industrial Compliance Management Portal
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
          padding: 32, boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}>

          {/* Mode tabs */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.05)',
            borderRadius: 10, padding: 4, marginBottom: 28, gap: 4,
          }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  background: mode === m ? '#003366' : 'transparent',
                  color: mode === m ? '#fff' : '#64748B',
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              color: '#FCA5A5', fontSize: 13,
            }}>{error}</div>
          )}
          {success && (
            <div style={{
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              color: '#6EE7B7', fontSize: 13,
            }}>{success}</div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>

            {/* Role selector — register only */}
            {mode === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: 10 }}>
                  USER TYPE
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ROLES.map(r => (
                    <button key={r.id} type="button" onClick={() => setRole(r.id)}
                      style={{
                        flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: role === r.id ? `${r.color}18` : 'rgba(255,255,255,0.04)',
                        outline: role === r.id ? `2px solid ${r.color}60` : '2px solid transparent',
                        transition: 'all 0.2s', textAlign: 'center',
                      }}>
                      <r.icon size={18} style={{ color: role === r.id ? r.color : '#475569', margin: '0 auto 4px' }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: role === r.id ? r.color : '#475569', lineHeight: 1.3 }}>
                        {r.label}
                      </div>
                    </button>
                  ))}
                </div>
                <p style={{ color: '#475569', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                  {selectedRole.desc}
                </p>
              </div>
            )}

            {/* Full name — register only */}
            {mode === 'register' && (
              <Field icon={User} label="Full Name" id="fullName" type="text"
                value={form.fullName} onChange={v => set('fullName', v)} required />
            )}

            {/* Role-specific fields */}
            {mode === 'register' && role === 'industry' && (
              <>
                <Field icon={Building2} label="Industry / Company Name" id="industryName" type="text"
                  value={form.industryName} onChange={v => set('industryName', v)} required />
                <Field icon={Hash} label="Allottee Code (if available)" id="allotteeCode" type="text"
                  value={form.allotteeCode} onChange={v => set('allotteeCode', v)} />
              </>
            )}
            {mode === 'register' && role === 'official' && (
              <>
                <Field icon={MapPin} label="District" id="district" type="text"
                  value={form.district} onChange={v => set('district', v)} required />
                <Field icon={Briefcase} label="Department" id="department" type="text"
                  value={form.department} onChange={v => set('department', v)} required />
              </>
            )}

            {/* Email */}
            <Field icon={Mail} label="Email Address" id="email" type="email"
              value={form.email} onChange={v => set('email', v)} required />

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                  id="password" type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{
                    width: '100%', padding: '10px 40px 10px 36px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F1F5F9', fontSize: 14, boxSizing: 'border-box', outline: 'none',
                  }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#1E3A5F' : 'linear-gradient(135deg, #003366 0%, #0055A4 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s', opacity: loading ? 0.8 : 1,
              }}>
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  {loadingMsg}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In to Portal' : 'Create Account'}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 20 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 20 }}>
          SIPCOT TRACK &nbsp;|&nbsp; Government of Tamil Nadu &nbsp;|&nbsp; Secure Portal
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: rgba(59,130,246,0.5) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      `}</style>
    </div>
  );
}

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ icon: Icon, label, id, type, value, onChange, required }: {
  icon: any; label: string; id: string; type: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input
          id={id} type={type} value={value} required={required}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#F1F5F9', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
          }}
        />
      </div>
    </div>
  );
}

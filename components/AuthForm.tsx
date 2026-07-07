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

const DISTRICTS = [
  'Chennai', 'Kancheepuram', 'Thiruvallur', 'Krishnagiri', 'Coimbatore', 
  'Madurai', 'Erode', 'Ranipet', 'Cuddalore', 'Thoothukudi', 'Vellore',
  'Trichy', 'Salem', 'Tiruppur', 'Dharmapuri', 'Chengalpattu'
].sort();

const DEPARTMENTS = [
  'Projects', 'Planning', 'Land Acquisition', 'Finance', 'Environmental',
  'IT & Smart Cities', 'Legal', 'Administration', 'District Office'
].sort();

const REDIRECT: Record<Role, string> = {
  industry: '/dashboard',
  official: '/dashboard',
  admin:    '/admin/dashboard',
};

export default function AuthForm({ defaultMode = 'login', forcedRole }: { defaultMode?: Mode; forcedRole?: Role }) {
  const router = useRouter();
  const [mode, setMode]           = useState<Mode>(defaultMode);
  const [role, setRole]           = useState<Role>(forcedRole || 'industry');
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
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(135deg, #003366 0%, #004d99 60%, #002244 100%)' }}>

      <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1 }}>

        {/* Gov Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.3)',
            borderRadius: 50, padding: '8px 20px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', color: '#FF9900' }}>
              GOVERNMENT OF TAMIL NADU
            </span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            SIPCOT <span style={{ color: '#FF9900' }}>TRACK</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, margin: '8px 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {mode === 'login' ? 'Secure Access Portal' : 'Service Registration'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 24,
          padding: 40,
          boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
        }}>

          {/* Mode tabs */}
          <div style={{
            display: 'flex', background: '#F1F5F9',
            borderRadius: 12, padding: 5, marginBottom: 32, gap: 5,
          }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: mode === m ? '#003366' : 'transparent',
                  color: mode === m ? '#fff' : '#64748B',
                  boxShadow: mode === m ? '0 4px 12px rgba(0,51,102,0.2)' : 'none',
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FEE2E2',
              borderRadius: 10, padding: '12px 16px', marginBottom: 24,
              color: '#B91C1C', fontSize: 13, fontWeight: 500,
            }}>{error}</div>
          )}
          {success && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #DCFCE7',
              borderRadius: 10, padding: '12px 16px', marginBottom: 24,
              color: '#15803D', fontSize: 13, fontWeight: 500,
            }}>{success}</div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>

            {/* Role selector — register only, hide if forced */}
            {mode === 'register' && !forcedRole && (
              <div style={{ marginBottom: 28 }}>
                <label style={{ color: '#475569', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: 12, textTransform: 'uppercase' }}>
                  Select Account Type
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {ROLES.map(r => (
                    <button key={r.id} type="button" onClick={() => setRole(r.id)}
                      style={{
                        flex: 1, padding: '14px 8px', borderRadius: 14, border: '2px solid transparent', cursor: 'pointer',
                        background: role === r.id ? '#F8FAFC' : '#fff',
                        borderColor: role === r.id ? '#FF9900' : '#F1F5F9',
                        transition: 'all 0.2s', textAlign: 'center',
                        boxShadow: role === r.id ? '0 10px 20px rgba(255,153,0,0.1)' : 'none',
                      }}>
                      <r.icon size={22} style={{ color: role === r.id ? '#FF9900' : '#CBD5E1', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 11, fontWeight: 800, color: role === r.id ? '#003366' : '#94A3B8', lineHeight: 1.2 }}>
                        {r.label.split(' ')[1] || r.label}
                      </div>
                    </button>
                  ))}
                </div>
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
                <Field icon={Hash} label="Allottee Code" id="allotteeCode" type="text"
                  value={form.allotteeCode} onChange={v => set('allotteeCode', v)} />
              </>
            )}
            {mode === 'register' && role === 'official' && (
              <>
                <SelectField icon={MapPin} label="District" id="district" 
                  options={DISTRICTS} value={form.district} onChange={v => set('district', v)} required />
                <SelectField icon={Briefcase} label="Department" id="department" 
                  options={DEPARTMENTS} value={form.department} onChange={v => set('department', v)} required />
              </>
            )}

            {/* Email */}
            <Field icon={Mail} label="Email Address" id="email" type="email"
              value={form.email} onChange={v => set('email', v)} required />

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: '#475569', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  id="password" type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{
                    width: '100%', padding: '14px 48px 14px 44px', borderRadius: 12,
                    background: '#F8FAFC', border: '2px solid #F1F5F9',
                    color: '#1E293B', fontSize: 15, fontWeight: 500, boxSizing: 'border-box', outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#64748B' : '#003366',
                color: '#fff', fontSize: 15, fontWeight: 800, marginTop: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.3s', boxShadow: '0 10px 30px rgba(0,51,102,0.2)',
                textTransform: 'uppercase', letterSpacing: '1px',
              }}>
              {loading ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  {loadingMsg}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Enter Portal' : 'Create Secure Account'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid #F1F5F9' }}>
            <p style={{ color: '#64748B', fontSize: 14, fontWeight: 500 }}>
              {mode === 'login' ? "New industrial partner? " : 'Existing account? '}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
                style={{ background: 'none', border: 'none', color: '#FF9900', cursor: 'pointer', fontWeight: 800, fontSize: 14, textDecoration: 'underline', padding: '0 4px' }}>
                {mode === 'login' ? 'Register Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 32, fontWeight: 500 }}>
          SIPCOT TRACK · Secure Infrastructure Monitoring · TN GOV
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #FF9900 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(255,153,0,0.1) !important; }
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
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={id} style={{ color: '#475569', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          id={id} type={type} value={value} required={required}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, boxSizing: 'border-box',
            background: '#F8FAFC', border: '2px solid #F1F5F9',
            color: '#1E293B', fontSize: 15, fontWeight: 500, outline: 'none', transition: 'all 0.2s',
          }}
        />
      </div>
    </div>
  );
}

// ── Select field ──────────────────────────────────────────────────────────────
function SelectField({ icon: Icon, label, id, options, value, onChange, required }: {
  icon: any; label: string; id: string; options: string[];
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={id} style={{ color: '#475569', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
        <select
          id={id} value={value} required={required}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, boxSizing: 'border-box',
            background: '#F8FAFC', border: '2px solid #F1F5F9',
            color: '#1E293B', fontSize: 15, fontWeight: 500, outline: 'none', transition: 'all 0.2s',
            appearance: 'none', cursor: 'pointer',
          }}
        >
          <option value="">Select {label}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
    </div>
  );
}

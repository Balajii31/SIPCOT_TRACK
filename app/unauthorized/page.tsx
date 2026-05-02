'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ShieldX, Clock, Home } from 'lucide-react';
import Link from 'next/link';

function UnauthorizedContent() {
  const params = useSearchParams();
  const reason = params.get('reason');

  const isPending = reason === 'pending';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)',
        border: `1px solid ${isPending ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
        borderRadius: 16, padding: 48, maxWidth: 420, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
          background: isPending ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPending
            ? <Clock size={32} color="#F59E0B" />
            : <ShieldX size={32} color="#EF4444" />
          }
        </div>

        <h1 style={{ color: '#F1F5F9', fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
          {isPending ? 'Account Pending Approval' : 'Access Denied'}
        </h1>

        <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 32px' }}>
          {isPending
            ? 'Your account has been submitted and is awaiting approval from a SIPCOT administrator. You will receive an email notification once your account is activated.'
            : 'You do not have permission to access this section. Please contact your SIPCOT administrator if you believe this is an error.'
          }
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/login" style={{
            padding: '10px 24px', borderRadius: 8, background: '#003366',
            color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}>
            Back to Login
          </Link>
          <Link href="/" style={{
            padding: '10px 24px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94A3B8', textDecoration: 'none', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Home size={14} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0F172A' }} />}>
      <UnauthorizedContent />
    </Suspense>
  );
}

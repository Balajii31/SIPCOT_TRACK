import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Route access map ──────────────────────────────────────────────────────────
const ROLE_ROUTES: Record<string, string[]> = {
  '/admin/dashboard':    ['admin'],
  '/admin/verify':       ['admin', 'official'],
  '/allottee':           ['industry'],
  '/dashboard/admin':    ['admin'],
  '/dashboard/official': ['official', 'admin'],
  '/dashboard/industry': ['industry'],
};

const PUBLIC_ROUTES = [
  '/login', '/signup', '/(auth)', '/unauthorized',
  '/_next', '/favicon.ico', '/api',
];

function isPublic(path: string) {
  return PUBLIC_ROUTES.some(p => path.startsWith(p));
}

function requiredRoles(path: string): string[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTES)) {
    if (path.startsWith(prefix)) return roles;
  }
  return null; // no restriction
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (isPublic(pathname)) return NextResponse.next();

  // Check for Supabase session cookie
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Build supabase client with cookie auth
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Cookie: request.headers.get('cookie') ?? '' },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  const allowed = requiredRoles(pathname);
  if (allowed) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Pending account gate
    if (profile.status === 'pending') {
      return NextResponse.redirect(new URL('/unauthorized?reason=pending', request.url));
    }

    // Wrong role gate
    if (!allowed.includes(profile.role)) {
      return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.png$|.*\\.svg$).*)',
  ],
};

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ROLE_ROUTES: Record<string, string[]> = {
  '/admin/dashboard':    ['admin'],
  '/admin/verify':       ['admin', 'official'],
  '/allottee':           ['industry'],
  '/dashboard/admin':    ['admin'],
  '/dashboard/official': ['official', 'admin'],
  '/dashboard/industry': ['industry'],
};

const PUBLIC_PATHS = [
  '/', '/login', '/signup', '/unauthorized',
  '/_next', '/favicon.ico', '/api',
];

function isPublic(path: string) {
  return PUBLIC_PATHS.some(p => path.startsWith(p));
}

function requiredRoles(path: string): string[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTES)) {
    if (path.startsWith(prefix)) return roles;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Restore session from cookie
  const cookie = request.cookies.get('sb-iafcqhltfsrkzyipooha-auth-token')?.value;
  if (cookie) {
    try {
      const [access_token, refresh_token] = JSON.parse(decodeURIComponent(cookie));
      await supabase.auth.setSession({ access_token, refresh_token });
    } catch (e) {
      console.error('Failed to parse auth cookie', e);
    }
  }

  // Create a privileged client for the profile check to bypass RLS
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowed = requiredRoles(pathname);
  if (allowed) {
    // Use adminClient to ensure we can read the profile regardless of RLS
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.redirect(new URL('/login', request.url));

    if (profile.status === 'pending')
      return NextResponse.redirect(new URL('/unauthorized?reason=pending', request.url));

    if (!allowed.includes(profile.role))
      return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.png$|.*\\.svg$).*)'],
};

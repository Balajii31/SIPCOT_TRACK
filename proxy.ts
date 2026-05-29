import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/unauthorized',
];

function isPublic(path: string) {
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/api/') ||
    path.match(/\.(png|jpg|jpeg|gif|svg|css|js|webp)$/)
  ) {
    return true;
  }
  return PUBLIC_PATHS.includes(path);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass public paths
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 2. Restore session from browser cookies
  const cookie = request.cookies.get('sb-iafcqhltfsrkzyipooha-auth-token')?.value;
  if (cookie) {
    try {
      const [access_token, refresh_token] = JSON.parse(decodeURIComponent(cookie));
      await supabase.auth.setSession({ access_token, refresh_token });
    } catch (e) {
      console.error('Failed to parse auth cookie in proxy:', e);
    }
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 3. Redirect to login if user is not authenticated
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Create a privileged client to query public.profiles bypassing RLS policies
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  // 5. Handle missing profile
  if (!profile) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('sb-iafcqhltfsrkzyipooha-auth-token');
    return response;
  }

  // 6. Handle pending status
  if (profile.status === 'pending') {
    if (pathname !== '/unauthorized' || request.nextUrl.searchParams.get('reason') !== 'pending') {
      return NextResponse.redirect(new URL('/unauthorized?reason=pending', request.url));
    }
    return NextResponse.next();
  }

  // 7. Enforce Role-Based Access Gates
  if (pathname.startsWith('/dashboard/admin')) {
    if (profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/verify')) {
      if (profile.role !== 'admin' && profile.role !== 'official') {
        return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
      }
    } else {
      if (profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
      }
    }
  }

  if (pathname.startsWith('/dashboard/official')) {
    if (profile.role !== 'official') {
      return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
    }
  }

  if (pathname.startsWith('/dashboard/industry') || pathname.startsWith('/allottee')) {
    if (profile.role !== 'industry') {
      return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.png$|.*\\.svg$).*)'],
};

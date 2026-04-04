/**
 * Next.js Edge Middleware — protects routes behind Supabase Auth.
 *
 * Unauthenticated users are redirected to `/login`.
 * The middleware also refreshes expired sessions transparently.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { isE2eMockAuthServer } from '@/lib/e2eMockAuth';

/** Routes that do NOT require authentication. */
const PUBLIC_ROUTES = new Set(['/', '/login', '/auth/callback']);

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.has(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /** Playwright: skip real Supabase session checks (see `PLAYWRIGHT_USE_MOCK_AUTH`). */
  if (isE2eMockAuthServer()) {
    return NextResponse.next();
  }

  // Let public routes through without session check
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // No Supabase configured — let the request through
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update cookies on the request (for downstream server code)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // Rebuild the response with updated request + response cookies
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the session (reads + writes cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, robots.txt, sitemap.xml (static files)
     * - Public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

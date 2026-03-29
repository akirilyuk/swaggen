/**
 * Auth callback route — exchanges the PKCE code for a session.
 *
 * Supabase Auth redirects here after email confirmation / OAuth.
 */
import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') ?? '/';

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] Code exchange error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}

/**
 * Server-side signup route — creates a Supabase user with email_confirm: true
 * so test / example emails work without a confirmation link.
 *
 * POST /api/auth/signup  { email: string; password: string }
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('[api/auth/signup] Missing Supabase URL or service role key');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 },
    );
  }

  // Admin client bypasses RLS and email confirmation
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('[api/auth/signup] Created admin Supabase client for:', url);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('[api/auth/signup] createUser error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    console.error(
      '[api/auth/signup] User creation succeeded but no user returned',
    );
    return NextResponse.json(
      { error: 'User creation failed' },
      { status: 500 },
    );
  }

  console.log('[api/auth/signup] Created user:', data.user.id, email);
  return NextResponse.json({ userId: data.user.id }, { status: 201 });
}

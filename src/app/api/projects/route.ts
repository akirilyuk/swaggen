/**
 * GET /api/projects  — list all projects from Supabase
 *
 * Uses the supabaseDb service layer to fetch fully hydrated projects
 * (with entities, relations, middlewares, services, pages, etc).
 */
import { NextResponse } from 'next/server';

import { supabaseDb } from '@/lib/supabaseDb';

export async function GET() {
  if (!supabaseDb.isConfigured) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 503 },
    );
  }

  try {
    const projects = await supabaseDb.getProjects();
    return NextResponse.json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/projects] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

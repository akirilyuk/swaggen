/**
 * POST /api/_registry  — register or update a project's API paths
 */
import { NextRequest, NextResponse } from 'next/server';

import { registerProject, toSlug } from '@/lib/projectRegistry';
import type {
  ApiPath,
  Entity,
  MiddlewareConfig,
  ServiceConfig,
  UIPage,
} from '@/types/project';

interface RegistryPayload {
  name: string;
  /** Project id from the designer store (optional for older clients) */
  id?: string;
  apiPaths: ApiPath[];
  middlewares: MiddlewareConfig[];
  services: ServiceConfig[];
  pages?: UIPage[];
  entities?: Entity[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegistryPayload;

    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 },
      );
    }

    const slug = toSlug(body.name);

    registerProject({
      slug,
      name: body.name,
      ...(typeof body.id === 'string' && body.id.trim()
        ? { id: body.id.trim() }
        : {}),
      apiPaths: body.apiPaths ?? [],
      middlewares: body.middlewares ?? [],
      services: body.services ?? [],
      pages: body.pages ?? [],
      entities: body.entities ?? [],
    });

    return NextResponse.json({ ok: true, slug });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

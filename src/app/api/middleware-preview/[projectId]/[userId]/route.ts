import { NextRequest, NextResponse } from 'next/server';

import { runSingleMiddlewareForPreview } from '@/lib/middlewareRuntime';
import {
  SWAGGEN_PROJECT_ID_HEADER,
  SWAGGEN_USER_ID_HEADER,
  swaggenIdsFromPathParams,
} from '@/lib/swaggenRequestMeta';
import type { MiddlewareConfig } from '@/types/project';

function jsonSafeReturn(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof NextResponse) {
    return { _note: 'NextResponse instance — see shortCircuit in output' };
  }
  if (typeof v !== 'object') return v;
  try {
    return JSON.parse(
      JSON.stringify(v, (_key, val) => {
        if (val instanceof NextResponse) {
          return '[NextResponse — see shortCircuit]';
        }
        return val;
      }),
    );
  } catch {
    return { _note: 'Could not serialize return value', preview: String(v) };
  }
}

type PreviewBody = {
  code?: string;
  name?: string;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

type RouteCtx = { params: Promise<{ projectId: string; userId: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { projectId: rawP, userId: rawU } = await ctx.params;
  const parsed = swaggenIdsFromPathParams(rawP, rawU);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'Invalid project id in path.' },
      { status: 400 },
    );
  }
  const { projectId, userIdForHeader } = parsed;

  let payload: PreviewBody;
  try {
    payload = (await req.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    code,
    name,
    method,
    path,
    headers: hdrs,
    body: rawBody,
  } = payload;
  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json(
      { error: 'Field "code" (middleware source) is required' },
      { status: 400 },
    );
  }

  const mw: MiddlewareConfig = {
    id: 'preview',
    name: typeof name === 'string' && name.trim() ? name.trim() : 'preview',
    description: '',
    enabled: true,
    order: 0,
    scope: 'global',
    isPreset: false,
    code,
  };

  const m = typeof method === 'string' ? method.toUpperCase() : 'GET';
  const p =
    typeof path === 'string' && path.startsWith('http')
      ? path
      : `http://preview.swaggen.local${typeof path === 'string' && path.startsWith('/') ? path : '/preview'}`;

  const headerRecord: Record<string, string> = {
    ...(hdrs && typeof hdrs === 'object' && !Array.isArray(hdrs) ? hdrs : {}),
  };
  headerRecord[SWAGGEN_PROJECT_ID_HEADER] = projectId;
  if (userIdForHeader) {
    headerRecord[SWAGGEN_USER_ID_HEADER] = userIdForHeader;
  }

  const mockReq = new NextRequest(p, {
    method: m,
    ...(Object.keys(headerRecord).length > 0 ? { headers: headerRecord } : {}),
    ...(rawBody != null &&
    rawBody !== '' &&
    (m === 'POST' || m === 'PUT' || m === 'PATCH')
      ? { body: rawBody }
      : {}),
  });
  const result = await runSingleMiddlewareForPreview(mockReq, mw);

  return NextResponse.json({
    ctx: result.ctx,
    returnValue: jsonSafeReturn(result.returnValue),
    shortCircuit: result.shortCircuit,
    errors: result.errors,
  });
}

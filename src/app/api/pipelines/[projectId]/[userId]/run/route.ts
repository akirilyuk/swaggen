import { NextRequest, NextResponse } from 'next/server';

import { runPipeline, serializeNextResponse } from '@/lib/middlewareRuntime';
import {
  SWAGGEN_PROJECT_ID_HEADER,
  SWAGGEN_USER_ID_HEADER,
  swaggenIdsFromPathParams,
} from '@/lib/swaggenRequestMeta';
import type { MiddlewareConfig, Pipeline } from '@/types/project';

type RunBody = {
  pipeline?: Pipeline;
  middlewares?: MiddlewareConfig[];
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

type RouteCtx = { params: Promise<{ projectId: string; userId: string }> };

function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

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

  let payload: RunBody;
  try {
    payload = (await req.json()) as RunBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const pipeline = payload.pipeline;
  const middlewares = payload.middlewares ?? [];
  if (!pipeline) {
    return NextResponse.json(
      { error: 'Field "pipeline" is required' },
      { status: 400 },
    );
  }

  const method = (payload.method ?? 'GET').toUpperCase();
  const path = payload.path?.startsWith('/') ? payload.path : '/preview';
  const url = `http://pipeline-runner.local${path}`;
  const headerRecord: Record<string, string> = {
    ...(payload.headers && typeof payload.headers === 'object' && !Array.isArray(payload.headers)
      ? payload.headers
      : {}),
  };
  headerRecord[SWAGGEN_PROJECT_ID_HEADER] = projectId;
  if (userIdForHeader) {
    headerRecord[SWAGGEN_USER_ID_HEADER] = userIdForHeader;
  }
  const rawBody = payload.body ?? '';

  const mockReq = new NextRequest(url, {
    method,
    ...(Object.keys(headerRecord).length > 0 ? { headers: headerRecord } : {}),
    ...(rawBody && ['POST', 'PUT', 'PATCH'].includes(method)
      ? { body: rawBody }
      : {}),
  });

  const ordered = [...(pipeline.steps ?? [])].sort((a, b) => a.order - b.order);
  const steps = ordered.filter(s => s.type === 'middleware');

  if (steps.length === 0) {
    return NextResponse.json({
      ok: true,
      stopped: false,
      steps: [],
      message:
        'No middleware chain steps in this pipeline. Add a step and pick middlewares under Pipelines.',
    });
  }

  const outputs: Array<Record<string, unknown>> = [];

  for (const step of steps) {
    const ids = (step.config?.middlewareIds as string[] | undefined) ?? [];
    const chain = ids
      .map(id => middlewares.find(mw => mw.id === id))
      .filter((mw): mw is MiddlewareConfig => !!mw && mw.enabled);

    const result = await runPipeline(mockReq, chain);
    const shortCircuit = result.response
      ? await serializeNextResponse(result.response)
      : null;

    outputs.push({
      stepId: step.id,
      stepName: step.name,
      type: step.type,
      middlewareCount: chain.length,
      errors: result.errors,
      ctx: toJsonSafe(result.ctx),
      lastReturnValue: toJsonSafe(result.lastReturnValue),
      shortCircuit,
    });

    if (shortCircuit) {
      return NextResponse.json({
        ok: true,
        stopped: true,
        reason: `Pipeline stopped by middleware response at step "${step.name}"`,
        steps: outputs,
      });
    }
  }

  return NextResponse.json({ ok: true, stopped: false, steps: outputs });
}

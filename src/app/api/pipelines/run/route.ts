import { NextRequest, NextResponse } from 'next/server';

import { runPipeline, serializeNextResponse } from '@/lib/middlewareRuntime';
import type { MiddlewareConfig, Pipeline } from '@/types/project';

type RunBody = {
  pipeline?: Pipeline;
  middlewares?: MiddlewareConfig[];
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export async function POST(req: NextRequest) {
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
  const headers = payload.headers ?? {};
  const rawBody = payload.body ?? '';

  const mockReq = new NextRequest(url, {
    method,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(rawBody && ['POST', 'PUT', 'PATCH'].includes(method)
      ? { body: rawBody }
      : {}),
  });

  const steps = [...(pipeline.steps ?? [])].sort((a, b) => a.order - b.order);
  const outputs: Array<Record<string, unknown>> = [];

  for (const step of steps) {
    if (step.type === 'middleware') {
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
      continue;
    }

    outputs.push({
      stepId: step.id,
      stepName: step.name,
      type: step.type,
      skipped: true,
      note: 'Execution currently implemented for middleware steps.',
    });
  }

  return NextResponse.json({ ok: true, stopped: false, steps: outputs });
}


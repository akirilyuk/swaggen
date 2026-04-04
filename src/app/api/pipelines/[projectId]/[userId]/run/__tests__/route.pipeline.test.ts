import { NextRequest } from 'next/server';

import { POST } from '@/app/api/pipelines/[projectId]/[userId]/run/route';
import type { MiddlewareConfig, Pipeline } from '@/types/project';

function routeCtx(projectId: string, userId: string) {
  return { params: Promise.resolve({ projectId, userId }) };
}

function mw(partial: Partial<MiddlewareConfig> & Pick<MiddlewareConfig, 'id' | 'name' | 'code'>): MiddlewareConfig {
  return {
    description: '',
    enabled: true,
    isPreset: false,
    order: 0,
    scope: 'global',
    ...partial,
  };
}

async function jsonBody(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

describe('POST /api/pipelines/[projectId]/[userId]/run (pipeline workflow)', () => {
  it('returns 400 when JSON is invalid', async () => {
    const req = new NextRequest(
      'http://local.test/api/pipelines/p1/_/run',
      {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'application/json' },
      },
    );
    const res = await POST(req, routeCtx('p1', '_'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when pipeline is missing', async () => {
    const req = new NextRequest(
      'http://local.test/api/pipelines/p1/_/run',
      {
        method: 'POST',
        body: JSON.stringify({ middlewares: [] }),
        headers: { 'content-type': 'application/json' },
      },
    );
    const res = await POST(req, routeCtx('p1', '_'));
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/pipeline/i);
  });

  it('runs ordered middleware steps and returns ctx from the chain', async () => {
    const middlewares: MiddlewareConfig[] = [
      mw({
        id: 'm-a',
        name: 'first',
        order: 0,
        code: `
async function first(req, ctx) {
  return { ctx: { custom: { step: 1 } } };
}
`,
      }),
      mw({
        id: 'm-b',
        name: 'second',
        order: 1,
        code: `
async function second(req, ctx) {
  return { ctx: { custom: { step: 2, prev: ctx.custom.step } } };
}
`,
      }),
    ];

    const pipeline: Pipeline = {
      id: 'pipe-1',
      name: 'Test',
      steps: [
        {
          id: 's1',
          type: 'middleware',
          name: 'Chain',
          order: 0,
          config: { middlewareIds: ['m-a', 'm-b'] },
        },
      ],
    };

    const req = new NextRequest(
      'http://local.test/api/pipelines/p1/_/run',
      {
        method: 'POST',
        body: JSON.stringify({ pipeline, middlewares }),
        headers: { 'content-type': 'application/json' },
      },
    );

    const res = await POST(req, routeCtx('p1', '_'));
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
    expect(body.stopped).toBe(false);
    const steps = body.steps as Array<{ ctx?: { custom?: Record<string, unknown> } }>;
    expect(steps).toHaveLength(1);
    expect(steps[0].ctx?.custom).toMatchObject({ step: 2, prev: 1 });
  });

  it('stops the pipeline when middleware returns a response', async () => {
    const middlewares: MiddlewareConfig[] = [
      mw({
        id: 'gate',
        name: 'gate',
        code: `
async function gate(req, ctx) {
  return {
    response: NextResponse.json({ blocked: true }, { status: 403 }),
  };
}
`,
      }),
    ];

    const pipeline: Pipeline = {
      id: 'pipe-2',
      name: 'Stop early',
      steps: [
        {
          id: 's1',
          type: 'middleware',
          name: 'Gate',
          order: 0,
          config: { middlewareIds: ['gate'] },
        },
        {
          id: 's2',
          type: 'transform',
          name: 'Never runs',
          order: 1,
          config: {},
        },
      ],
    };

    const req = new NextRequest(
      'http://local.test/api/pipelines/p1/_/run',
      {
        method: 'POST',
        body: JSON.stringify({ pipeline, middlewares }),
        headers: { 'content-type': 'application/json' },
      },
    );

    const res = await POST(req, routeCtx('p1', '_'));
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.stopped).toBe(true);
    expect(String(body.reason)).toMatch(/stopped/i);
  });

  it('returns no step output when the pipeline has no middleware chain steps', async () => {
    const pipeline: Pipeline = {
      id: 'pipe-3',
      name: 'Bots only',
      steps: [
        {
          id: 'b1',
          type: 'bot',
          name: 'LLM',
          order: 0,
          config: {},
        },
      ],
    };

    const req = new NextRequest(
      'http://local.test/api/pipelines/p1/_/run',
      {
        method: 'POST',
        body: JSON.stringify({ pipeline, middlewares: [] }),
        headers: { 'content-type': 'application/json' },
      },
    );

    const res = await POST(req, routeCtx('p1', '_'));
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
    const steps = body.steps as unknown[];
    expect(steps).toHaveLength(0);
    expect(String(body.message)).toMatch(/middleware chain/i);
  });

  it('filters disabled middleware out of the chain', async () => {
    const middlewares: MiddlewareConfig[] = [
      mw({
        id: 'off',
        name: 'disabled',
        enabled: false,
        code: `
async function disabled(req, ctx) {
  return { ctx: { custom: { shouldNotRun: true } } };
}
`,
      }),
    ];

    const pipeline: Pipeline = {
      id: 'pipe-4',
      name: 'No-op',
      steps: [
        {
          id: 's1',
          type: 'middleware',
          name: 'Empty chain',
          order: 0,
          config: { middlewareIds: ['off'] },
        },
      ],
    };

    const req = new NextRequest(
      'http://local.test/api/pipelines/p1/_/run',
      {
        method: 'POST',
        body: JSON.stringify({ pipeline, middlewares }),
        headers: { 'content-type': 'application/json' },
      },
    );

    const res = await POST(req, routeCtx('p1', '_'));
    const body = await jsonBody(res);
    const steps = body.steps as Array<{ middlewareCount?: number; ctx?: { custom?: unknown } }>;
    expect(steps[0].middlewareCount).toBe(0);
    expect(steps[0].ctx?.custom).toEqual({});
  });
});

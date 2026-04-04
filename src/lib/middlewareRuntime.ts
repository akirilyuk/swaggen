/**
 * Server-side execution of user-authored middleware code (TypeScript → JS).
 * Used by the dynamic API route and the middleware preview endpoint.
 */
import { NextRequest, NextResponse } from 'next/server';

import type { MiddlewareConfig } from '@/types/project';

import {
  readSwaggenHeader,
  SWAGGEN_PROJECT_ID_HEADER,
  SWAGGEN_USER_ID_HEADER,
} from '@/lib/swaggenRequestMeta';

export interface PipelineContext {
  requestId?: string;
  requestStart?: number;
  /** Swaggen project id (header `x-swaggen-project-id` or set by the host). */
  projectId?: string;
  userId?: string;
  token?: string;
  validatedBody?: unknown;
  corsHeaders?: Record<string, string>;
  custom: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MiddlewareResult {
  ctx?: Partial<PipelineContext>;
  response?: NextResponse;
}

export function stripTypeScript(src: string): string {
  let out = src;

  out = out.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  out = out.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '');

  out = out.replace(/^export\s+/gm, '');

  out = out.replace(
    /((?:async\s+)?function\s+\w+\s*)\(([^)]*)\)/g,
    (_match: string, prefix: string, params: string) => {
      const stripped = params
        .split(',')
        .map((p: string) => p.replace(/:\s*[^,)]+/, '').trim())
        .join(', ');
      return `${prefix}(${stripped})`;
    },
  );

  out = out.replace(/\)\s*:\s*Promise\s*<[\s\S]*?>\s*\{/g, ') {');
  out = out.replace(/\)\s*:\s*\w[\w.]*(?:<[\s\S]*?>)?\s*\{/g, ') {');

  out = out.replace(/^type\s+\w+[\s\S]*?;\s*$/gm, '');
  out = out.replace(/^interface\s+\w+\s*\{[\s\S]*?^}\s*$/gm, '');

  out = out.replace(/new\s+(\w+)\s*<[\s\S]*?>\s*\(/g, 'new $1(');

  out = out.replace(/\bas\s+\w[\w.<>,\s|&\[\]]*(?=[;,)\]\s}])/g, '');

  return out;
}

export function compileMiddleware(mw: MiddlewareConfig): {
  name: string;
  fn: (req: NextRequest, ctx: PipelineContext) => Promise<MiddlewareResult>;
} | null {
  try {
    const src = stripTypeScript(mw.code);

    const nameMatch = src.match(/async\s+function\s+(\w+)/);
    const fnName = nameMatch?.[1] ?? mw.name;

    const wrapper = `
      const NextResponse = this.NextResponse;
      const crypto = this.crypto;
      const process = this.process;
      const console = this.console;
      ${src}
      return ${fnName};
    `;

    const factory = new Function(wrapper);
    const fn = factory.call({
      NextResponse,
      crypto,
      process: typeof process !== 'undefined' ? process : { env: {} },
      console,
    });

    if (typeof fn !== 'function') return null;

    return { name: mw.name, fn };
  } catch {
    return null;
  }
}

export function mergeCtx(ctx: PipelineContext, patch: Partial<PipelineContext>) {
  const { custom: newCustom, ...rest } = patch;
  Object.assign(ctx, rest);
  if (newCustom) {
    ctx.custom = { ...ctx.custom, ...newCustom };
  }
}

export interface PipelineResult {
  response?: NextResponse;
  ctx: PipelineContext;
  lastReturnValue: unknown;
  errors: string[];
}

export async function runPipeline(
  req: NextRequest,
  middlewares: MiddlewareConfig[],
): Promise<PipelineResult> {
  const ctx: PipelineContext = {
    requestId: req.headers.get('x-request-id') ?? crypto.randomUUID(),
    requestStart: Date.now(),
    projectId: readSwaggenHeader(req, SWAGGEN_PROJECT_ID_HEADER),
    userId: readSwaggenHeader(req, SWAGGEN_USER_ID_HEADER),
    custom: {},
  };

  const errors: string[] = [];
  let lastReturnValue: unknown = undefined;

  for (const mw of middlewares) {
    const compiled = compileMiddleware(mw);
    if (!compiled) {
      errors.push(`${mw.name}: compilation failed`);
      continue;
    }

    try {
      const result = await compiled.fn(req, ctx);
      lastReturnValue = result;

      if (result == null || typeof result !== 'object') continue;

      if ('response' in result && result.response) {
        if (result.ctx) mergeCtx(ctx, result.ctx);
        return {
          response: result.response as NextResponse,
          ctx,
          lastReturnValue,
          errors,
        };
      }

      if ('ctx' in result && result.ctx) {
        mergeCtx(ctx, result.ctx);
      }

      if (!('ctx' in result) && !('response' in result)) {
        lastReturnValue = result;
      }
    } catch (err) {
      errors.push(
        `${mw.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { ctx, lastReturnValue, errors };
}

export async function serializeNextResponse(res: NextResponse): Promise<{
  status: number;
  headers: Record<string, string>;
  body: unknown;
}> {
  const text = await res.clone().text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw string */
  }
  return {
    status: res.status,
    headers: Object.fromEntries([...res.headers.entries()]),
    body,
  };
}

export async function runSingleMiddlewareForPreview(
  req: NextRequest,
  mw: MiddlewareConfig,
): Promise<{
  ctx: PipelineContext;
  returnValue: unknown;
  shortCircuit: Awaited<ReturnType<typeof serializeNextResponse>> | null;
  errors: string[];
}> {
  const ctx: PipelineContext = {
    requestId: req.headers.get('x-request-id') ?? crypto.randomUUID(),
    requestStart: Date.now(),
    projectId: readSwaggenHeader(req, SWAGGEN_PROJECT_ID_HEADER),
    userId: readSwaggenHeader(req, SWAGGEN_USER_ID_HEADER),
    custom: {},
  };

  const errors: string[] = [];
  const compiled = compileMiddleware(mw);
  if (!compiled) {
    errors.push(`${mw.name || 'middleware'}: compilation failed`);
    return { ctx, returnValue: undefined, shortCircuit: null, errors };
  }

  try {
    const result = await compiled.fn(req, ctx);

    if (result == null || typeof result !== 'object') {
      return { ctx, returnValue: result, shortCircuit: null, errors };
    }

    if ('response' in result && result.response) {
      if (result.ctx) mergeCtx(ctx, result.ctx);
      const shortCircuit = await serializeNextResponse(
        result.response as NextResponse,
      );
      return { ctx, returnValue: result, shortCircuit, errors };
    }

    if ('ctx' in result && result.ctx) {
      mergeCtx(ctx, result.ctx);
    }

    return { ctx, returnValue: result, shortCircuit: null, errors };
  } catch (err) {
    errors.push(
      `${mw.name}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { ctx, returnValue: undefined, shortCircuit: null, errors };
  }
}

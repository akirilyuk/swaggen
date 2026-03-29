/**
 * Built-in middleware presets that users can add with one click.
 * Inspired by the swaggen core middlewares (log, ping, validate).
 *
 * Every preset uses the typed `PipelineContext` to pass data between
 * middlewares. See the "pipelineExample" preset for a detailed walkthrough.
 */
import type { MiddlewareScope } from '@/types/project';

export interface MiddlewarePreset {
  name: string;
  description: string;
  scope: MiddlewareScope;
  code: string;
}

export const MIDDLEWARE_PRESETS: MiddlewarePreset[] = [
  /* ================================================================ */
  /*  EXAMPLE — demonstrates the pipeline data-passing system          */
  /* ================================================================ */
  {
    name: 'pipelineExample',
    description:
      'Example middleware that shows how to read and write data through the typed PipelineContext. Add this to learn how data flows between middlewares.',
    scope: 'route',
    code: `import { NextRequest } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * ── Pipeline Data-Passing Example ──────────────────────────────────
 *
 * Every middleware receives the same \`ctx: PipelineContext\` object.
 * It has two areas for storing data:
 *
 *   1. **Built-in typed slots** (top-level properties)
 *      ctx.requestId   — set by the log / requestId / errorHandler middleware
 *      ctx.requestStart — set by the log / errorHandler middleware
 *      ctx.userId      — set by the auth middleware
 *      ctx.token       — set by the auth middleware
 *      ctx.validatedBody — set by the validate middleware
 *      ctx.corsHeaders — set by the cors middleware
 *
 *   2. **Custom slot** (\`ctx.custom\`)
 *      An open Record<string, unknown> for any domain-specific data.
 *
 * ── How to WRITE data (for downstream middlewares) ────────────────
 *
 *   Return it in the \`ctx\` property of SwaggenMiddlewareResult:
 *
 *     return {
 *       ctx: {
 *         userId: 'u_123',                    // built-in slot
 *         custom: { tenant: 'acme-corp' },    // custom slot
 *       },
 *     };
 *
 *   The pipeline runner merges this into the shared context before
 *   calling the next middleware.
 *
 * ── How to READ data (from earlier middlewares) ───────────────────
 *
 *   Just read from \`ctx\` — it already contains everything that
 *   previous middlewares wrote:
 *
 *     const userId = ctx.userId;              // typed as string | undefined
 *     const tenant = ctx.custom.tenant;       // typed as unknown
 *
 * ── How to SHORT-CIRCUIT the chain ────────────────────────────────
 *
 *   Return a \`response\` to stop the chain immediately:
 *
 *     return {
 *       response: NextResponse.json({ error: 'Nope' }, { status: 403 }),
 *     };
 *
 * ── Execution order ───────────────────────────────────────────────
 *
 *   Global middlewares run first (sorted by \`order\`), then
 *   route-scoped middlewares, then the handler. All share one ctx.
 *
 * ──────────────────────────────────────────────────────────────────
 */
export async function pipelineExample(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  // Read data from earlier middlewares
  const requestId = ctx.requestId ?? 'no-request-id';

  console.log(\`[pipelineExample] running for request \${requestId}\`);

  // Write custom data for downstream middlewares and the handler
  return {
    ctx: {
      custom: {
        processedBy: [
          ...((ctx.custom.processedBy as string[]) ?? []),
          'pipelineExample',
        ],
        exampleTimestamp: Date.now(),
      },
    },
  };
}
`,
  },

  /* ================================================================ */
  /*  Global middlewares — run on every single request                  */
  /* ================================================================ */
  {
    name: 'log',
    description:
      'Logs every incoming request with method, path, duration, and a unique request ID. Writes ctx.requestId and ctx.requestStart.',
    scope: 'global',
    code: `import { NextRequest } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * Log middleware — runs on every request.
 * Writes: ctx.requestId, ctx.requestStart
 */
export async function log(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  const requestId = ctx.requestId ?? crypto.randomUUID();
  const start = Date.now();

  console.log(
    \`[\${requestId}] \${req.method} \${req.nextUrl.pathname} — started\`,
  );

  return {
    ctx: { requestId, requestStart: start },
  };
}
`,
  },
  {
    name: 'cors',
    description:
      'Adds CORS headers to allow cross-origin requests. Handles OPTIONS preflight. Writes ctx.corsHeaders.',
    scope: 'global',
    code: `import { NextRequest, NextResponse } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS?.split(',') ?? ['*'];
const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Request-ID';

/**
 * CORS middleware — adds cross-origin headers to every response.
 * Short-circuits with 204 for OPTIONS preflight requests.
 * Writes: ctx.corsHeaders
 */
export async function cors(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin =
    ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
      ? origin || '*'
      : '';

  if (req.method === 'OPTIONS') {
    return {
      response: new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': ALLOWED_METHODS,
          'Access-Control-Allow-Headers': ALLOWED_HEADERS,
          'Access-Control-Max-Age': '86400',
        },
      }),
    };
  }

  return {
    ctx: {
      corsHeaders: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      },
    },
  };
}
`,
  },
  {
    name: 'requestId',
    description:
      'Generates or forwards a unique request ID. Writes ctx.requestId.',
    scope: 'global',
    code: `import { NextRequest } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * RequestId middleware — reads X-Request-ID header or generates a new UUID.
 * Writes: ctx.requestId
 */
export async function requestId(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  const id = req.headers.get('x-request-id') ?? crypto.randomUUID();
  return { ctx: { requestId: id } };
}
`,
  },
  {
    name: 'errorHandler',
    description:
      'Adds request tracing context (requestId, start time) so that the built-in global error boundary can include them in 500 responses. Place this first in the global chain. The pipeline always catches unhandled errors — this middleware enriches the error output.',
    scope: 'global',
    code: `import { NextRequest } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * Error handler middleware — enriches the pipeline context with a
 * request ID and start timestamp so the global error boundary can
 * include them in structured 500 responses.
 *
 * The pipeline runner (withMiddlewares) always wraps the entire chain
 * in try/catch — this middleware does NOT need to be present for error
 * handling to work. It simply makes errors easier to trace.
 *
 * Place it FIRST in the global middleware chain.
 *
 * Writes: ctx.requestId, ctx.requestStart
 */
export async function errorHandler(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  return {
    ctx: {
      requestId: ctx.requestId ?? req.headers.get('x-request-id') ?? crypto.randomUUID(),
      requestStart: Date.now(),
    },
  };
}
`,
  },
  {
    name: 'rateLimit',
    description:
      'Simple in-memory rate limiter. Limits requests per IP within a sliding window.',
    scope: 'global',
    code: `import { NextRequest, NextResponse } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;
const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate-limit middleware — tracks requests per IP address.
 * Returns 429 if the limit is exceeded.
 */
export async function rateLimit(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return {};
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      response: NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      ),
    };
  }

  return {};
}
`,
  },

  /* ================================================================ */
  /*  Route-scoped middlewares — assigned per entity                    */
  /* ================================================================ */
  {
    name: 'auth',
    description:
      'Validates a Bearer token from the Authorization header. Writes ctx.userId and ctx.token.',
    scope: 'route',
    code: `import { NextRequest, NextResponse } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * Auth middleware — verifies the Authorization header.
 * Writes: ctx.userId, ctx.token
 *
 * Replace the token validation with your actual auth logic
 * (JWT verification, session lookup, etc.).
 */
export async function auth(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  const header = req.headers.get('authorization');

  if (!header?.startsWith('Bearer ')) {
    return {
      response: NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 },
      ),
    };
  }

  const token = header.slice(7);

  if (!token) {
    return {
      response: NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 },
      ),
    };
  }

  // TODO: replace with real token verification
  return {
    ctx: { userId: 'extracted-user-id', token },
  };
}
`,
  },
  {
    name: 'validate',
    description:
      'Parses the JSON request body for POST/PUT/PATCH requests. Writes ctx.validatedBody.',
    scope: 'route',
    code: `import { NextRequest, NextResponse } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * Validate middleware — parses the request body as JSON.
 * Writes: ctx.validatedBody
 *
 * To add Zod schema validation, import your schema and call
 * schema.parse(body) before assigning to ctx.validatedBody.
 */
export async function validate(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return {};
  }

  try {
    const body = await req.json();
    return { ctx: { validatedBody: body } };
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      ),
    };
  }
}
`,
  },
  {
    name: 'ownerCheck',
    description:
      'Ensures the authenticated user owns the resource. Reads ctx.userId (requires auth middleware first).',
    scope: 'route',
    code: `import { NextRequest, NextResponse } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * Owner check middleware — verifies that the current user
 * owns the resource being accessed.
 *
 * Reads: ctx.userId (set by the auth middleware)
 *
 * This demonstrates reading data that an earlier middleware wrote.
 */
export async function ownerCheck(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  // Read userId that was set by the auth middleware
  if (!ctx.userId) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      ),
    };
  }

  // TODO: look up the resource and compare ownerId with ctx.userId
  console.log(\`[ownerCheck] user \${ctx.userId} accessing resource\`);

  return {};
}
`,
  },
];

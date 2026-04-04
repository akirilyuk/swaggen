/**
 * Dynamic handler for all project API paths.
 *
 * URL pattern: /api/{projectSlug}/{...path}
 *
 * Builds a middleware pipeline from global (enabled, sorted by order)
 * and operation-specific middlewares, executes them in sequence, and
 * returns the final result.
 */
import { NextRequest, NextResponse } from 'next/server';

import { runPipeline } from '@/lib/middlewareRuntime';
import { getProject, type RegisteredProject } from '@/lib/projectRegistry';
import { cloneNextRequestWithSwaggenProject } from '@/lib/swaggenRequestMeta';
import type {
  ApiPath,
  ApiPathOperation,
  MiddlewareConfig,
} from '@/types/project';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RouteParams {
  params: Promise<{ projectSlug: string; path: string[] }>;
}

/* ------------------------------------------------------------------ */
/*  Path matching                                                      */
/* ------------------------------------------------------------------ */

function matchPath(
  apiPath: string,
  segments: string[],
): Record<string, string> | null {
  const pathSegments = apiPath.split('/').filter(Boolean);
  if (pathSegments.length !== segments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < pathSegments.length; i++) {
    const def = pathSegments[i];
    const actual = segments[i];
    if (def.startsWith('{') && def.endsWith('}')) {
      params[def.slice(1, -1)] = actual;
    } else if (def !== actual) {
      return null;
    }
  }
  return params;
}

function unwrapPromise(type?: string): string | undefined {
  if (!type) return undefined;
  const match = type.match(/^Promise\s*<([\s\S]+)>$/);
  if (match) {
    const inner = match[1].trim();
    return inner === 'void' ? undefined : inner;
  }
  return type === 'void' ? undefined : type;
}

function inferHttpMethod(name: string): ApiPathOperation['method'] {
  const lower = name.toLowerCase();
  if (
    lower.startsWith('create') ||
    lower.startsWith('register') ||
    lower.startsWith('login') ||
    lower.startsWith('logout') ||
    lower.startsWith('refresh')
  )
    return 'POST';
  if (lower.startsWith('update')) return 'PUT';
  if (lower.startsWith('delete') || lower.startsWith('remove')) return 'DELETE';
  return 'GET';
}

function deriveServiceRoutes(project: RegisteredProject): ApiPath[] {
  const routes: ApiPath[] = [];
  for (const svc of project.services ?? []) {
    for (const method of svc.methods ?? []) {
      const inputName = unwrapPromise(method.inputType);
      const outputName = unwrapPromise(method.outputType);
      const baseName = (outputName ?? inputName ?? svc.name ?? 'resource')
        .replace('[]', '')
        .replace(/service$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
      const normalizedBase = baseName || 'resource';
      const verb = inferHttpMethod(method.name);
      const needsId =
        ['PUT', 'DELETE'].includes(verb) ||
        method.name.toLowerCase().startsWith('get');
      const pathKey = needsId
        ? `/${normalizedBase}s/{id}`
        : `/${normalizedBase}s`;

      routes.push({
        id: `svc-${svc.id}-${method.name}`,
        path: pathKey,
        description: `Derived from service ${svc.name}`,
        operations: [
          {
            id: `svc-op-${svc.id}-${method.name}`,
            method: verb,
            summary: method.description || method.name,
            description: `Derived service method ${svc.name}.${method.name}`,
            inputType: method.inputType,
            outputType: method.outputType,
            middlewareIds: [],
            tags: ['service', svc.name],
          },
        ],
      });
    }
  }
  return routes;
}

/**
 * Build the ordered middleware list for a matched operation.
 *  1. Global middlewares (enabled, sorted by order)
 *  2. Operation-specific middlewares (by middlewareIds, preserving order)
 */
function resolveMiddlewares(
  project: RegisteredProject,
  operation: ApiPathOperation,
): MiddlewareConfig[] {
  const globals = project.middlewares
    .filter(mw => mw.enabled && mw.scope === 'global')
    .sort((a, b) => a.order - b.order);

  const opMiddlewares = operation.middlewareIds
    .map(id => project.middlewares.find(mw => mw.id === id))
    .filter((mw): mw is MiddlewareConfig => !!mw && mw.enabled);

  const seen = new Set<string>();
  const result: MiddlewareConfig[] = [];

  for (const mw of [...globals, ...opMiddlewares]) {
    if (!seen.has(mw.id)) {
      seen.add(mw.id);
      result.push(mw);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Request handler                                                    */
/* ------------------------------------------------------------------ */

async function handleRequest(
  req: NextRequest,
  projectSlug: string,
  pathSegments: string[],
): Promise<NextResponse> {
  const project = getProject(projectSlug);

  if (!project) {
    return NextResponse.json(
      {
        error: `Project "${projectSlug}" is not registered in the server registry.`,
        hint: 'Open the SwaggenNext designer in your browser — the project registers automatically on page load. Then retry this request.',
        slug: projectSlug,
      },
      { status: 404 },
    );
  }

  const method = req.method.toUpperCase();
  const requestPath = `/${pathSegments.join('/')}`;
  let matchedPath: ApiPath | null = null;
  let matchedOp: ApiPathOperation | null = null;

  for (const ap of project.apiPaths) {
    const params = matchPath(ap.path, pathSegments);
    if (params === null) continue;

    const op = ap.operations.find(o => o.method === method);
    if (!op) continue;

    matchedPath = ap;
    matchedOp = op;
    break;
  }

  if (!matchedPath || !matchedOp) {
    const derived = deriveServiceRoutes(project);
    for (const ap of derived) {
      const params = matchPath(ap.path, pathSegments);
      if (params === null) continue;
      const op = ap.operations.find(o => o.method === method);
      if (!op) continue;
      matchedPath = ap;
      matchedOp = op;
      break;
    }
  }

  if (!matchedPath || !matchedOp) {
    // Service health-check fallback paths (configured in Services page)
    if (method === 'GET') {
      const healthServices = (project.services ?? []).filter(
        svc => svc.healthCheck?.enabled,
      );

      const normalize = (p: string) =>
        (p || '/').trim().replace(/\/+$/, '') || '/';
      const normalizedRequest = normalize(requestPath);

      if (normalizedRequest === '/health' && healthServices.length > 0) {
        const services = healthServices.map(svc => ({
          service: svc.name,
          healthy: true,
          details: { ready: true },
        }));
        return NextResponse.json(
          { healthy: services.every(s => s.healthy), services },
          { status: 200 },
        );
      }

      const matchedHealth = healthServices.find(svc => {
        const hcPath =
          svc.healthCheck?.path || `/health/${svc.name.toLowerCase()}`;
        return normalize(hcPath) === normalizedRequest;
      });

      if (matchedHealth) {
        return NextResponse.json(
          {
            service: matchedHealth.name,
            healthy: true,
            details: { ready: true },
          },
          { status: 200 },
        );
      }
    }

    const derived = deriveServiceRoutes(project);
    const allPaths = [...project.apiPaths, ...derived];
    const pathMatched = allPaths.some(
      ap => matchPath(ap.path, pathSegments) !== null,
    );

    if (pathMatched) {
      const allowedMethods = allPaths
        .filter(ap => matchPath(ap.path, pathSegments) !== null)
        .flatMap(ap => ap.operations.map(o => o.method));

      return NextResponse.json(
        { error: `Method ${method} not allowed on this path` },
        { status: 405, headers: { Allow: allowedMethods.join(', ') } },
      );
    }

    return NextResponse.json(
      {
        error: `No path matching "/${pathSegments.join(
          '/',
        )}" found in project "${project.name}"`,
        registeredPaths: allPaths.map(ap => ap.path),
      },
      { status: 404 },
    );
  }

  const middlewares = resolveMiddlewares(project, matchedOp);
  const pipelineReq = cloneNextRequestWithSwaggenProject(
    req,
    project.id ?? project.slug,
  );
  const {
    response: mwResponse,
    ctx,
    lastReturnValue,
    errors,
  } = await runPipeline(pipelineReq, middlewares);

  if (mwResponse) {
    return mwResponse;
  }

  let body: unknown;

  if (Object.keys(ctx.custom).length > 0) {
    body = ctx.custom;
  } else if (lastReturnValue != null && typeof lastReturnValue === 'object') {
    const rv = lastReturnValue as Record<string, unknown>;
    if (!('ctx' in rv) && !('response' in rv)) {
      body = rv;
    } else {
      body = {};
    }
  } else if (lastReturnValue != null) {
    body = { result: lastReturnValue };
  } else {
    body = {};
  }

  const headers: Record<string, string> = {
    'X-Swaggen-Project': project.name,
    'X-Swaggen-Path': matchedPath.path,
    'X-Swaggen-Operation': matchedOp.summary || method,
    'X-Request-Id': ctx.requestId ?? '',
  };

  if (errors.length > 0) {
    headers['X-Swaggen-Pipeline-Errors'] = errors.join('; ');
  }

  return NextResponse.json(body, {
    status: method === 'POST' ? 201 : 200,
    headers,
  });
}

/* ------------------------------------------------------------------ */
/*  HTTP method exports                                                */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { projectSlug, path } = await params;
  return handleRequest(req, projectSlug, path);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { projectSlug, path } = await params;
  return handleRequest(req, projectSlug, path);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { projectSlug, path } = await params;
  return handleRequest(req, projectSlug, path);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { projectSlug, path } = await params;
  return handleRequest(req, projectSlug, path);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { projectSlug, path } = await params;
  return handleRequest(req, projectSlug, path);
}

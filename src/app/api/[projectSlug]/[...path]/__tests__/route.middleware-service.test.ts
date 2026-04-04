/**
 * Dynamic API route: global middleware enriches ctx, then the handler
 * builds the JSON body. Service-derived paths (no explicit apiPaths) use
 * the same pipeline.
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';
import { getProject } from '@/lib/projectRegistry';
import type { RegisteredProject } from '@/lib/projectRegistry';

jest.mock('@/lib/projectRegistry', () => ({
  getProject: jest.fn(),
}));

const mockedGetProject = jest.mocked(getProject);

function baseProject(
  overrides: Partial<RegisteredProject> = {},
): RegisteredProject {
  return {
    slug: 'demo-app',
    name: 'Demo App',
    apiPaths: [],
    middlewares: [],
    services: [],
    pages: [],
    entities: [],
    ...overrides,
  };
}

describe('GET /api/[projectSlug]/[...path] — middleware + service-derived routes', () => {
  beforeEach(() => {
    mockedGetProject.mockReset();
  });

  it('runs global middleware before responding to a service-derived GET route', async () => {
    mockedGetProject.mockReturnValue(
      baseProject({
        middlewares: [
          {
            id: 'mw-enrich',
            name: 'enrich',
            description: '',
            enabled: true,
            order: 0,
            scope: 'global',
            isPreset: false,
            code: `
async function enrich(req, ctx) {
  return {
    ctx: {
      custom: {
        trace: 'middleware-ran',
        path: req.nextUrl.pathname,
      },
    },
  };
}
`,
          },
        ],
        services: [
          {
            id: 'svc-widgets',
            name: 'WidgetService',
            description: '',
            methods: [
              {
                name: 'listWidgets',
                description: 'List all widgets',
                outputType: 'Promise<Widget[]>',
              },
            ],
            code: '',
            dependencies: [],
          },
        ],
      }),
    );

    const request = new NextRequest(
      'http://localhost/api/demo-app/widgets',
      { method: 'GET' },
    );

    const response = await GET(request, {
      params: Promise.resolve({ projectSlug: 'demo-app', path: ['widgets'] }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      trace: 'middleware-ran',
      path: '/api/demo-app/widgets',
    });
    expect(response.headers.get('X-Swaggen-Project')).toBe('Demo App');
    expect(response.headers.get('X-Swaggen-Path')).toBe('/widgets');
  });

  it('runs operation-scoped middleware after global middleware for explicit apiPaths', async () => {
    mockedGetProject.mockReturnValue(
      baseProject({
        middlewares: [
          {
            id: 'global-tag',
            name: 'globalTag',
            description: '',
            enabled: true,
            order: 0,
            scope: 'global',
            isPreset: false,
            code: `
async function globalTag(req, ctx) {
  return { ctx: { custom: { phase: 'global' } } };
}
`,
          },
          {
            id: 'route-only',
            name: 'routeOnly',
            description: '',
            enabled: true,
            order: 1,
            scope: 'route',
            isPreset: false,
            code: `
async function routeOnly(req, ctx) {
  return {
    ctx: {
      custom: {
        phase: 'route',
        inherited: ctx.custom.phase,
      },
    },
  };
}
`,
          },
        ],
        apiPaths: [
          {
            id: 'path-items',
            path: '/items',
            description: '',
            operations: [
              {
                id: 'op-list',
                method: 'GET',
                summary: 'List items',
                description: '',
                middlewareIds: ['route-only'],
                tags: [],
              },
            ],
          },
        ],
      }),
    );

    const request = new NextRequest(
      'http://localhost/api/demo-app/items',
      { method: 'GET' },
    );

    const response = await GET(request, {
      params: Promise.resolve({ projectSlug: 'demo-app', path: ['items'] }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      phase: 'route',
      inherited: 'global',
    });
  });

  it('returns middleware short-circuit response without executing handler body merge', async () => {
    mockedGetProject.mockReturnValue(
      baseProject({
        middlewares: [
          {
            id: 'deny',
            name: 'deny',
            description: '',
            enabled: true,
            order: 0,
            scope: 'global',
            isPreset: false,
            code: `
async function deny(req, ctx) {
  return {
    response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
  };
}
`,
          },
        ],
        services: [
          {
            id: 'svc',
            name: 'NoteService',
            description: '',
            methods: [
              {
                name: 'listNotes',
                description: '',
                outputType: 'Promise<Note[]>',
              },
            ],
            code: '',
            dependencies: [],
          },
        ],
      }),
    );

    const request = new NextRequest(
      'http://localhost/api/demo-app/notes',
      { method: 'GET' },
    );

    const response = await GET(request, {
      params: Promise.resolve({ projectSlug: 'demo-app', path: ['notes'] }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'forbidden' });
  });
});

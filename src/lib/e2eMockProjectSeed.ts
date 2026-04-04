/**
 * Deterministic project graph for Playwright when using in-memory persist.
 *
 * UUIDs are fixed (not random) so unit/e2e expectations stay stable and the seed
 * matches what we assert in `e2e/authenticated/app.spec.ts`. `PERSIST_VERSION` in
 * the JSON must stay aligned with `projectStore`’s `version` or rehydration runs
 * the wrong migrate path.
 */
import { MIDDLEWARE_PRESETS } from '@/lib/middlewarePresets';
import type {
  Entity,
  EntityRelation,
  MiddlewareConfig,
  Pipeline,
  Project,
} from '@/types/project';

const OPENAPI_SEED = JSON.stringify(
  {
    openapi: '3.0.0',
    info: { title: 'E2E Mock API', version: '1.0.0', description: '' },
    paths: {},
    components: { schemas: {} },
  },
  null,
  2,
);

/** Referenced by tests that assume a single active seeded project. */
export const E2E_MOCK_PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const ENT_AUTHOR = '22222222-2222-2222-2222-222222222222';
const ENT_POST = '33333333-3333-3333-3333-333333333333';
const REL_ID = '44444444-4444-4444-4444-444444444444';
const MW_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PIPE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const STEP_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function defaultMiddlewares(): MiddlewareConfig[] {
  const preset = MIDDLEWARE_PRESETS.find(p => p.name === 'errorHandler');
  if (!preset) return [];
  return [
    {
      id: MW_ID,
      name: preset.name,
      description: preset.description,
      enabled: true,
      order: 0,
      scope: preset.scope,
      isPreset: true,
      code: preset.code,
    },
  ];
}

const authorEntity: Entity = {
  id: ENT_AUTHOR,
  name: 'Author',
  description: 'Content author',
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'bio', type: 'string', required: false },
  ],
  middlewareBindings: [],
};

const postEntity: Entity = {
  id: ENT_POST,
  name: 'Post',
  fields: [{ name: 'title', type: 'string', required: true }],
  middlewareBindings: [],
};

const relation: EntityRelation = {
  id: REL_ID,
  sourceEntityId: ENT_POST,
  targetEntityId: ENT_AUTHOR,
  type: 'many-to-one',
  fieldName: 'author',
  description: 'Post author',
};

const samplePipeline: Pipeline = {
  id: PIPE_ID,
  name: 'E2E Sample Pipeline',
  description: 'Mock pipeline for end-to-end tests',
  steps: [
    {
      id: STEP_ID,
      type: 'transform',
      name: 'Mock transform',
      order: 0,
      config: { e2e: true },
    },
  ],
};

export function buildE2eMockProject(): Project {
  const now = '2026-04-01T12:00:00.000Z';
  return {
    id: E2E_MOCK_PROJECT_ID,
    userId: null,
    accountId: null,
    name: 'E2E Mock API',
    description: 'Seeded project for Playwright',
    openApiSpec: OPENAPI_SEED,
    entities: [authorEntity, postEntity],
    relations: [relation],
    middlewares: defaultMiddlewares(),
    services: [],
    dataStorage: {
      provider: 'supabase',
      connectionString: '',
      enabled: false,
    },
    gitRepo: {
      url: '',
      branch: 'main',
      token: '',
      autoCommit: false,
    },
    pages: [],
    pipelines: [samplePipeline],
    bots: [],
    apiPaths: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Zustand persist blob for `swaggen-next-store`.
 * `version` must match `persist({ version })` in `projectStore.ts`.
 */
export function buildE2ePersistedStoreJson(): string {
  const project = buildE2eMockProject();
  return JSON.stringify({
    state: {
      projects: [project],
      activeProjectId: project.id,
    },
    version: 8,
  });
}

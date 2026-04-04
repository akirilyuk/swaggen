/**
 * Tests for the Supabase-backed Zustand persist adapter.
 * Run with: npx jest src/lib/__tests__/supabaseStorage.test.ts
 */

import { randomUUID } from 'crypto';

const uuidV4 = () => randomUUID();

import { supabase } from '../supabase';
import { supabaseStorage } from '../supabaseStorage';
import { supabaseDb } from '../supabaseDb';
import type { Entity, MiddlewareConfig, Project } from '@/types/project';

const TEST_KEY = '__test_key__';
const PERSIST_VERSION = 3;

describe('supabaseStorage', () => {
  // Skip tests if Supabase is not configured
  const skipIfNoSupabase = supabase ? describe : describe.skip;

  skipIfNoSupabase('with Supabase configured', () => {
    if (!supabase) return;
    const supabaseClient = supabase;

    const projectId = uuidV4();
    const middlewareId = uuidV4();
    const entityId = uuidV4();
    const pageId = uuidV4();
    const apiPathId = uuidV4();
    const pipelineId = uuidV4();
    const botId = uuidV4();
    const serviceId = uuidV4();

    const makeProject = (): Project => ({
      id: projectId,
      userId: null,
      accountId: null,
      name: 'Test Project',
      description: 'from supabaseStorage adapter test',
      openApiSpec: '{}',
      entities: [
        {
          id: entityId,
          name: 'User',
          description: 'User entity',
          fields: [
            {
              name: 'id',
              type: 'uuid' as const,
              required: true,
              description: 'User id',
            },
          ],
          middlewareBindings: [
            {
              middlewareId,
              methods: ['GET', 'POST'],
            },
          ],
        },
      ],
      relations: [],
      middlewares: [
        {
          id: middlewareId,
          name: 'authMiddleware',
          description: 'Test middleware',
          enabled: true,
          order: 0,
          scope: 'route',
          isPreset: false,
          code: '// test middleware',
        },
      ],
      services: [
        {
          id: serviceId,
          name: 'UserService',
          description: 'Test service',
          methods: [
            {
              name: 'listUsers',
              description: 'Lists users',
              inputType: 'void',
              outputType: 'User[]',
            },
          ],
          healthCheck: undefined,
          code: '// test service code',
          dependencies: [{ name: 'axios', version: '^1.5.0' }],
        },
      ],
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
      pages: [
        {
          id: pageId,
          path: '/users',
          name: 'Users',
          description: 'Users page',
          components: [],
        },
      ],
      pipelines: [
        {
          id: pipelineId,
          name: 'main',
          description: 'Pipeline',
          steps: [],
        },
      ],
      apiPaths: [
        {
          id: apiPathId,
          path: '/users',
          description: 'API path',
          operations: [],
        },
      ],
      bots: [
        {
          id: botId,
          name: 'Test Bot',
          description: 'Bot description',
          type: 'gpt',
          instructions: 'Hello',
          config: {},
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    afterAll(async () => {
      // Cleanup test data
      if (supabase) {
        const { data: meta } = await supabase
          .from('store_state_meta')
          .select('project_ids')
          .eq('key', TEST_KEY)
          .maybeSingle();

        const owned = meta?.project_ids ?? [];
        if (owned.length > 0) {
          await supabaseClient.from('projects').delete().in('id', owned);
        }
        await supabaseClient
          .from('store_state_meta')
          .delete()
          .eq('key', TEST_KEY);
      }
    });

    it('should write meta and track project IDs via setItem', async () => {
      const projects = [makeProject()];
      const activeProjectId = projectId;

      // setItem only writes meta now — create the project row first via supabaseDb
      await supabaseDb.createProject(makeProject());

      await supabaseStorage.setItem(
        TEST_KEY,
        JSON.stringify({
          state: { projects, activeProjectId },
          version: PERSIST_VERSION,
        }),
      );

      // Verify meta row was created
      const dbMeta = await supabaseClient
        .from('store_state_meta')
        .select('active_project_id, project_ids')
        .eq('key', TEST_KEY)
        .maybeSingle();
      expect(dbMeta.error).toBeNull();
      expect(dbMeta.data?.active_project_id).toBe(activeProjectId);
      expect(dbMeta.data?.project_ids).toContain(projectId);
    });

    it('should read projects back via getItem', async () => {
      const serialised = await supabaseStorage.getItem(TEST_KEY);
      expect(serialised).not.toBeNull();

      const parsed = serialised ? JSON.parse(serialised) : null;
      expect(parsed?.version).toBe(PERSIST_VERSION);
      expect(parsed?.state?.activeProjectId).toBe(projectId);
      expect(parsed?.state?.projects).toHaveLength(1);
      expect(parsed?.state?.projects[0]?.name).toBe('Test Project');
    });

    it('should write and read entities via granular supabaseDb calls', async () => {
      // Create entity via the singleton method
      const entity = makeProject().entities[0] as Entity;
      await supabaseDb.createEntity(projectId, entity);

      // Verify entity was written
      const { data: entities, error } = await supabaseClient
        .from('entities')
        .select('*')
        .eq('project_id', projectId);
      expect(error).toBeNull();
      expect(entities).toHaveLength(1);
      expect(entities?.[0]?.name).toBe('User');

      // Update entity via singleton method
      await supabaseDb.updateEntity(entityId, {
        ...entity,
        name: 'User (updated)',
        description: 'Updated entity',
      } as Partial<Entity>);

      const { data: updated } = await supabaseClient
        .from('entities')
        .select('*')
        .eq('id', entityId)
        .maybeSingle();
      expect(updated?.name).toBe('User (updated)');
    });

    it('should write middlewares via granular supabaseDb calls', async () => {
      const mw = makeProject().middlewares[0] as MiddlewareConfig;
      await supabaseDb.createMiddleware(projectId, mw);

      const { data, error } = await supabaseClient
        .from('middlewares')
        .select('*')
        .eq('id', middlewareId)
        .maybeSingle();
      expect(error).toBeNull();
      expect(data?.name).toBe('authMiddleware');
      expect(data?.code).toBe('// test middleware');

      // Update
      await supabaseDb.updateMiddleware(middlewareId, {
        ...mw,
        code: '// updated middleware',
      } as Partial<MiddlewareConfig>);

      const { data: updated } = await supabaseClient
        .from('middlewares')
        .select('*')
        .eq('id', middlewareId)
        .maybeSingle();
      expect(updated?.code).toBe('// updated middleware');
    });

    it('should remove projects from meta when deleted via setItem', async () => {
      // setItem with empty projects list should remove the project from meta
      await supabaseStorage.setItem(
        TEST_KEY,
        JSON.stringify({
          state: { projects: [], activeProjectId: null },
          version: PERSIST_VERSION,
        }),
      );

      const dbMeta = await supabaseClient
        .from('store_state_meta')
        .select('project_ids')
        .eq('key', TEST_KEY)
        .maybeSingle();
      expect(dbMeta.data?.project_ids).toEqual([]);

      // The project row should have been cascade-deleted
      const { data: project } = await supabaseClient
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .maybeSingle();
      expect(project).toBeNull();
    });
  });

  describe('without Supabase', () => {
    it('should have supabase client defined or null', () => {
      // Just verify the module loads correctly
      expect(supabase === null || typeof supabase === 'object').toBe(true);
    });
  });
});

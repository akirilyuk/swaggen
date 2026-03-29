/**
 * Supabase Database Service
 *
 * Provides typed CRUD operations for all project-related tables.
 * Each model has its own table instead of storing everything in kv_store.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ApiPathOperation,
  ApiPath,
  Bot,
  Entity,
  EntityField,
  EntityMiddlewareBinding,
  EntityRelation,
  MiddlewareConfig,
  Pipeline,
  PipelineStep,
  Project,
  ServiceConfig,
  UIComponent,
  UIPage,
  UILayoutSlot,
} from '@/types/project';

import { getSupabaseClient } from './supabase';
import { dbLogger } from './supabaseLogger';

/* ------------------------------------------------------------------ */
/*  Database Row Types (snake_case from Supabase)                      */
/* ------------------------------------------------------------------ */

interface ProjectRow {
  id: string;
  /** Supabase Auth user id — required for RLS (migration 006). */
  user_id: string | null;
  account_id: string | null;
  name: string;
  description: string;
  open_api_spec: string;
  data_storage: Project['dataStorage'];
  git_repo: Project['gitRepo'];
  created_at: string;
  updated_at: string;
}

interface EntityRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  fields: Entity['fields'];
  middleware_bindings: Entity['middlewareBindings'];
  created_at: string;
  updated_at: string;
}

interface EntityRelationRow {
  id: string;
  project_id: string;
  source_entity_id: string;
  target_entity_id: string;
  type: EntityRelation['type'];
  field_name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface MiddlewareRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  scope: MiddlewareConfig['scope'];
  is_preset: boolean;
  code: string;
  created_at: string;
  updated_at: string;
}

interface ServiceRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  methods: ServiceConfig['methods'];
  health_check: ServiceConfig['healthCheck'];
  code: string;
  dependencies: ServiceConfig['dependencies'];
  created_at: string;
  updated_at: string;
}

interface PageRow {
  id: string;
  project_id: string;
  path: string;
  name: string;
  description: string;
  components: UIPage['components'];
  created_at: string;
  updated_at: string;
}

interface ApiPathRow {
  id: string;
  project_id: string;
  path: string;
  description: string;
  operations: ApiPath['operations'];
  created_at: string;
  updated_at: string;
}

interface PipelineRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  steps: Pipeline['steps'];
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Nested Child Tables (normalized arrays)                          */
/* ------------------------------------------------------------------ */

interface EntityFieldRow {
  entity_id: string;
  field_order: number;
  name: string;
  type: EntityField['type'];
  required: boolean;
  description: string;
  default_value: string | null;
  created_at: string;
  updated_at: string;
}

interface EntityFieldEnumValueRow {
  entity_id: string;
  field_order: number;
  enum_order: number;
  value: string;
}

interface EntityMiddlewareBindingRow {
  entity_id: string;
  binding_order: number;
  middleware_id: string;
  created_at: string;
  updated_at: string;
}

interface EntityMiddlewareBindingMethodRow {
  entity_id: string;
  binding_order: number;
  method_order: number;
  method: EntityMiddlewareBinding['methods'][number];
}

interface ServiceMethodRow {
  service_id: string;
  method_order: number;
  name: string;
  description: string;
  entity_id: string | null;
  input_type: string | null;
  output_type: string | null;
  code: string | null;
}

interface ServiceDependencyRow {
  service_id: string;
  dependency_order: number;
  name: string;
  version: string;
}

interface PageComponentRow {
  id: string;
  page_id: string;
  template: UIComponent['template'];
  title: string;
  entity_id: string | null;
  relation_id: string | null;
  slot: UILayoutSlot;
  order: number;
  position_x: number;
  position_y: number;
  size_width: number;
  size_height: number;
  linked_submit_button_id: string | null;
  submit_action: UIComponent['submitAction'] | null;
  props: UIComponent['props'];
  created_at: string;
  updated_at: string;
}

interface PageComponentVisibleFieldRow {
  page_component_id: string;
  visible_field_order: number;
  field_name: string;
}

interface PageComponentLinkedComponentRow {
  page_component_id: string;
  linked_component_order: number;
  linked_component_id: string;
}

interface ApiPathOperationRow {
  id: string;
  api_path_id: string;
  operation_order: number;
  method: ApiPathOperation['method'];
  summary: string;
  description: string;
  input_type: string | null;
  output_type: string | null;
}

interface ApiPathOperationMiddlewareIdRow {
  operation_id: string;
  middleware_order: number;
  middleware_id: string;
}

interface ApiPathOperationTagRow {
  operation_id: string;
  tag_order: number;
  tag: string;
}

interface PipelineStepRow {
  id: string;
  pipeline_id: string;
  step_order: number;
  type: PipelineStep['type'];
  name: string;
  description: string;
  bot_id: string | null;
  code: string | null;
  config: PipelineStep['config'];
}

interface BotRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  type: string;
  instructions: string;
  config: Bot['config'];
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Converters: Row <-> Domain Model                                   */
/* ------------------------------------------------------------------ */

const toProject = (
  row: ProjectRow,
  ownerUserId: string | null,
): Omit<
  Project,
  | 'entities'
  | 'relations'
  | 'middlewares'
  | 'services'
  | 'pages'
  | 'apiPaths'
  | 'pipelines'
  | 'bots'
> => ({
  id: row.id,
  userId: ownerUserId,
  accountId: row.account_id,
  name: row.name,
  description: row.description,
  openApiSpec: row.open_api_spec,
  dataStorage: row.data_storage,
  gitRepo: row.git_repo,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** @deprecated Entities are now assembled from normalized child tables. */

const toRelation = (row: EntityRelationRow): EntityRelation => ({
  id: row.id,
  sourceEntityId: row.source_entity_id,
  targetEntityId: row.target_entity_id,
  type: row.type,
  fieldName: row.field_name,
  description: row.description,
});

const toMiddleware = (row: MiddlewareRow): MiddlewareConfig => ({
  id: row.id,
  name: row.name,
  description: row.description,
  enabled: row.enabled,
  order: row.order,
  scope: row.scope,
  isPreset: row.is_preset,
  code: row.code,
});

/** @deprecated Services are now assembled from normalized child tables. */

/** @deprecated Pages are now assembled from normalized child tables. */

/** @deprecated API paths are now assembled from normalized child tables. */

/** @deprecated Pipelines are now assembled from normalized pipeline_steps table. */

const toBot = (row: BotRow): Bot => ({
  id: row.id,
  name: row.name,
  description: row.description,
  type: row.type,
  instructions: row.instructions,
  config: row.config,
});

/* ------------------------------------------------------------------ */
/*  Database Service Class                                             */
/* ------------------------------------------------------------------ */

class SupabaseDbService {
  /** Session-aware in the browser (cookie SSR client); required for RLS. */
  private get client(): SupabaseClient | null {
    return getSupabaseClient();
  }

  constructor() {
    console.log('[supabaseDb] Initialized SupabaseDb service');
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Log an error when a method is called without a Supabase client.
   * Called from every guard clause so missing-client issues are visible.
   */
  private logNoClient(method: string): void {
    dbLogger.error(
      method,
      'Supabase client is not configured — operation skipped. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  /**
   * Resolve auth user ids for `public.accounts` rows (avoids PostgREST embed
   * `projects.accounts(...)` which requires a cached FK relationship).
   */
  private async fetchUserIdByAccountId(
    accountIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!this.client || accountIds.length === 0) return map;

    const unique = [...new Set(accountIds)].filter(Boolean);
    if (unique.length === 0) return map;

    const { data, error } = await this.client
      .from('accounts')
      .select('id, user_id')
      .in('id', unique);

    if (error) {
      dbLogger.error('fetchUserIdByAccountId error:', error.message);
      return map;
    }

    for (const row of data ?? []) {
      const r = row as { id: string; user_id: string };
      map.set(r.id, r.user_id);
    }
    return map;
  }

  private userIdForProjectRow(
    row: ProjectRow,
    accountToUser: Map<string, string>,
  ): string | null {
    if (row.user_id) return row.user_id;
    if (row.account_id) return accountToUser.get(row.account_id) ?? null;
    return null;
  }

  /* ---------------------------------------------------------------- */
  /*  Projects                                                         */
  /* ---------------------------------------------------------------- */

  async getProjects(): Promise<Project[]> {
    if (!this.client) {
      this.logNoClient('getProjects');
      return [];
    }
    const done = dbLogger.time('getProjects');
    dbLogger.debug('getProjects', 'fetching all projects');

    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      dbLogger.error('getProjects error:', error.message);
      done();
      return [];
    }

    const rows = (data ?? []) as ProjectRow[];
    const accountToUser = await this.fetchUserIdByAccountId(
      rows.map(r => r.account_id).filter((id): id is string => Boolean(id)),
    );

    dbLogger.verbose(
      'getProjects',
      `${rows.length} project rows`,
    );

    // Fetch all related data for each project
    const result = await Promise.all(
      rows.map(async row => {
        const [
          entities,
          relations,
          middlewares,
          services,
          pages,
          apiPaths,
          pipelines,
          bots,
        ] = await Promise.all([
          this.getEntities(row.id),
          this.getRelations(row.id),
          this.getMiddlewares(row.id),
          this.getServices(row.id),
          this.getPages(row.id),
          this.getApiPaths(row.id),
          this.getPipelines(row.id),
          this.getBots(row.id),
        ]);

        return {
          ...toProject(row, this.userIdForProjectRow(row, accountToUser)),
          entities,
          relations,
          middlewares,
          services,
          pages,
          apiPaths,
          pipelines,
          bots,
        } as Project;
      }),
    );
    dbLogger.ok('getProjects', `${result.length} projects loaded`);
    done();
    return result;
  }

  async getProject(id: string): Promise<Project | null> {
    if (!this.client) {
      this.logNoClient('getProject');
      return null;
    }
    const done = dbLogger.time('getProject');
    dbLogger.debug('getProject', id);

    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      dbLogger.error('getProject error:', error?.message);
      done();
      return null;
    }

    const row = data as ProjectRow;
    const accountToUser = await this.fetchUserIdByAccountId(
      row.account_id ? [row.account_id] : [],
    );
    const [
      entities,
      relations,
      middlewares,
      services,
      pages,
      apiPaths,
      pipelines,
      bots,
    ] = await Promise.all([
      this.getEntities(row.id),
      this.getRelations(row.id),
      this.getMiddlewares(row.id),
      this.getServices(row.id),
      this.getPages(row.id),
      this.getApiPaths(row.id),
      this.getPipelines(row.id),
      this.getBots(row.id),
    ]);

    dbLogger.ok('getProject', id, row.name);
    done();
    return {
      ...toProject(row, this.userIdForProjectRow(row, accountToUser)),
      entities,
      relations,
      middlewares,
      services,
      pages,
      apiPaths,
      pipelines,
      bots,
    } as Project;
  }

  async createProject(
    project: Omit<Project, 'createdAt' | 'updatedAt'>,
  ): Promise<Project | null> {
    if (!this.client) {
      this.logNoClient('createProject');
      return null;
    }
    dbLogger.debug('createProject', project.id, project.name);

    const { data, error } = await this.client
      .from('projects')
      .insert({
        id: project.id,
        user_id: project.userId,
        account_id: project.accountId,
        name: project.name,
        description: project.description,
        open_api_spec: project.openApiSpec,
        data_storage: project.dataStorage,
        git_repo: project.gitRepo,
      })
      .select('*')
      .single();

    if (error || !data) {
      dbLogger.error('createProject error:', error?.message);
      return null;
    }

    const row = data as ProjectRow;

    // Insert related entities
    await Promise.all([
      ...project.entities.map(e => this.createEntity(row.id, e)),
      ...project.relations.map(r => this.createRelation(row.id, r)),
      ...project.middlewares.map(m => this.createMiddleware(row.id, m)),
      ...project.services.map(s => this.createService(row.id, s)),
      ...project.pages.map(p => this.createPage(row.id, p)),
      ...project.apiPaths.map(a => this.createApiPath(row.id, a)),
      ...project.pipelines.map(p => this.createPipeline(row.id, p)),
      ...project.bots.map(b => this.createBot(row.id, b)),
    ]);

    dbLogger.ok('createProject', row.id, project.name);
    return this.getProject(row.id);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updateProject');
      return false;
    }
    dbLogger.debug('updateProject', id, Object.keys(updates).join(', '));

    const row: Record<string, unknown> = {};
    if (updates.userId !== undefined) row.user_id = updates.userId;
    if (updates.accountId !== undefined) row.account_id = updates.accountId;
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.openApiSpec !== undefined) row.open_api_spec = updates.openApiSpec;
    if (updates.dataStorage !== undefined) row.data_storage = updates.dataStorage;
    if (updates.gitRepo !== undefined) row.git_repo = updates.gitRepo;

    if (Object.keys(row).length === 0) {
      dbLogger.ok('updateProject', id, '(no-op)');
      return true;
    }

    const { error } = await this.client.from('projects').update(row).eq('id', id);

    if (error) {
      dbLogger.error('updateProject error:', error.message);
      return false;
    }

    dbLogger.ok('updateProject', id);
    return true;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteProject');
      return false;
    }
    dbLogger.debug('deleteProject', id);

    const { error } = await this.client.from('projects').delete().eq('id', id);

    if (error) {
      dbLogger.error('deleteProject error:', error.message);
      return false;
    }

    dbLogger.ok('deleteProject', id);
    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Entities                                                         */
  /* ---------------------------------------------------------------- */

  async getEntities(projectId: string): Promise<Entity[]> {
    if (!this.client) {
      this.logNoClient('getEntities');
      return [];
    }

    const { data, error } = await this.client
      .from('entities')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('getEntities error:', error.message);
      return [];
    }

    const rows = data as EntityRow[];
    return Promise.all(
      rows.map(async row => {
        // Prefer normalized child tables; fall back to JSONB columns for legacy data.
        let fields: Entity['fields'] = row.fields;
        let middlewareBindings: Entity['middlewareBindings'] =
          row.middleware_bindings;

        try {
          const [normalizedFields, normalizedBindings] = await Promise.all([
            this.getEntityFields(row.id),
            this.getEntityMiddlewareBindings(row.id),
          ]);
          if (normalizedFields.length > 0) fields = normalizedFields;
          if (normalizedBindings.length > 0)
            middlewareBindings = normalizedBindings;
        } catch {
          // If child tables aren't present (older DB), keep JSONB values.
        }

        return {
          id: row.id,
          name: row.name,
          description: row.description,
          fields,
          middlewareBindings,
        };
      }),
    );
  }

  async getEntityFields(entityId: string): Promise<Entity['fields']> {
    if (!this.client) {
      this.logNoClient('getEntityFields');
      return [];
    }

    const { data: fieldData, error: fieldsError } = await this.client
      .from('entity_fields')
      .select('*')
      .eq('entity_id', entityId)
      .order('field_order', { ascending: true });

    if (fieldsError) throw fieldsError;
    const rows = (fieldData ?? []) as EntityFieldRow[];
    if (rows.length === 0) return [];

    const { data: enumRows, error: enumsError } = await this.client
      .from('entity_field_enum_values')
      .select('*')
      .eq('entity_id', entityId);

    if (enumsError) throw enumsError;

    const enumsByFieldOrder = new Map<number, string[]>();
    (enumRows ?? []).forEach(r => {
      const key = (r as EntityFieldEnumValueRow).field_order;
      const arr = enumsByFieldOrder.get(key) ?? [];
      arr.push((r as EntityFieldEnumValueRow).value);
      enumsByFieldOrder.set(key, arr);
    });

    // Ensure stable ordering by enum_order
    for (const f of rows) {
      const enumSubset = (enumRows ?? [])
        .filter(
          r => (r as EntityFieldEnumValueRow).field_order === f.field_order,
        )
        .sort(
          (a, b) =>
            (a as EntityFieldEnumValueRow).enum_order -
            (b as EntityFieldEnumValueRow).enum_order,
        )
        .map(r => (r as EntityFieldEnumValueRow).value);
      enumsByFieldOrder.set(f.field_order, enumSubset);
    }

    return rows.map(r => ({
      name: r.name,
      type: r.type,
      required: r.required,
      description: r.description,
      defaultValue: r.default_value ?? undefined,
      enumValues:
        r.type === 'enum'
          ? enumsByFieldOrder.get(r.field_order) ?? []
          : undefined,
    }));
  }

  async getEntityMiddlewareBindings(
    entityId: string,
  ): Promise<Entity['middlewareBindings']> {
    if (!this.client) {
      this.logNoClient('getEntityMiddlewareBindings');
      return [];
    }

    const { data: bindingData, error: bindingsError } = await this.client
      .from('entity_middleware_bindings')
      .select('*')
      .eq('entity_id', entityId)
      .order('binding_order', { ascending: true });

    if (bindingsError) throw bindingsError;
    const bindingRows = (bindingData ?? []) as EntityMiddlewareBindingRow[];
    if (bindingRows.length === 0) return [];

    const bindingIds = bindingRows.map(r => r.binding_order);

    const { data: methodsData, error: methodsError } = await this.client
      .from('entity_middleware_binding_methods')
      .select('*')
      .eq('entity_id', entityId);

    if (methodsError) throw methodsError;
    const methodRows = (methodsData ??
      []) as EntityMiddlewareBindingMethodRow[];

    const methodsByBinding = new Map<
      number,
      Entity['middlewareBindings'][number]['methods']
    >();
    for (const b of bindingRows) {
      methodsByBinding.set(b.binding_order, []);
    }

    methodRows
      .filter(r => bindingIds.includes(r.binding_order))
      .sort(
        (a, b) =>
          a.binding_order - b.binding_order || a.method_order - b.method_order,
      )
      .forEach(r => {
        const arr = methodsByBinding.get(r.binding_order) ?? [];
        arr.push(r.method);
        methodsByBinding.set(r.binding_order, arr);
      });

    return bindingRows.map(b => ({
      middlewareId: b.middleware_id,
      methods: methodsByBinding.get(b.binding_order) ?? [],
    }));
  }

  async createEntity(
    projectId: string,
    entity: Entity,
  ): Promise<Entity | null> {
    if (!this.client) {
      this.logNoClient('createEntity');
      return null;
    }

    const { error } = await this.client
      .from('entities')
      .insert({
        id: entity.id,
        project_id: projectId,
        name: entity.name,
        description: entity.description ?? '',
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createEntity error:', error.message);
      return null;
    }

    // Insert normalized children
    if (entity.fields.length > 0) {
      await this.client.from('entity_fields').insert(
        entity.fields.map((f, field_order) => ({
          entity_id: entity.id,
          field_order,
          name: f.name,
          type: f.type,
          required: f.required,
          description: f.description ?? '',
          default_value: f.defaultValue ?? null,
        })),
      );

      const enumRows = entity.fields.flatMap((f, field_order) => {
        if (f.type !== 'enum' || !f.enumValues?.length) return [];
        return f.enumValues.map((value, enum_order) => ({
          entity_id: entity.id,
          field_order,
          enum_order,
          value,
        }));
      });

      if (enumRows.length > 0) {
        await this.client.from('entity_field_enum_values').insert(enumRows);
      }
    }

    if (entity.middlewareBindings.length > 0) {
      const bindingRows = entity.middlewareBindings.map((b, binding_order) => ({
        entity_id: entity.id,
        binding_order,
        middleware_id: b.middlewareId,
      }));
      await this.client.from('entity_middleware_bindings').insert(bindingRows);

      const methodsRows = entity.middlewareBindings.flatMap(
        (b, binding_order) =>
          b.methods.map((method, method_order) => ({
            entity_id: entity.id,
            binding_order,
            method_order,
            method,
          })),
      );
      if (methodsRows.length > 0) {
        await this.client
          .from('entity_middleware_binding_methods')
          .insert(methodsRows);
      }
    }

    return entity;
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updateEntity');
      return false;
    }

    const { error } = await this.client
      .from('entities')
      .update({
        name: updates.name,
        description: updates.description,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updateEntity error:', error.message);
      return false;
    }

    if (updates.fields) {
      await this.client.from('entity_fields').delete().eq('entity_id', id);

      const fieldRows = updates.fields.map((f, field_order) => ({
        entity_id: id,
        field_order,
        name: f.name,
        type: f.type,
        required: f.required,
        description: f.description ?? '',
        default_value: f.defaultValue ?? null,
      }));
      if (fieldRows.length > 0) {
        await this.client.from('entity_fields').insert(fieldRows);
      }

      const enumRows = updates.fields.flatMap((f, field_order) => {
        if (f.type !== 'enum' || !f.enumValues?.length) return [];
        return f.enumValues.map((value, enum_order) => ({
          entity_id: id,
          field_order,
          enum_order,
          value,
        }));
      });
      if (enumRows.length > 0) {
        await this.client.from('entity_field_enum_values').insert(enumRows);
      }
    }

    if (updates.middlewareBindings) {
      await this.client
        .from('entity_middleware_bindings')
        .delete()
        .eq('entity_id', id);

      const bindingRows = updates.middlewareBindings.map(
        (b, binding_order) => ({
          entity_id: id,
          binding_order,
          middleware_id: b.middlewareId,
        }),
      );
      if (bindingRows.length > 0) {
        await this.client
          .from('entity_middleware_bindings')
          .insert(bindingRows);
      }

      const methodsRows = updates.middlewareBindings.flatMap(
        (b, binding_order) =>
          b.methods.map((method, method_order) => ({
            entity_id: id,
            binding_order,
            method_order,
            method,
          })),
      );
      if (methodsRows.length > 0) {
        await this.client
          .from('entity_middleware_binding_methods')
          .insert(methodsRows);
      }
    }

    return true;
  }

  async deleteEntity(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteEntity');
      return false;
    }

    const { error } = await this.client.from('entities').delete().eq('id', id);

    if (error) {
      dbLogger.error('deleteEntity error:', error.message);
      return false;
    }

    return true;
  }

  /** Delete all entities belonging to a project (CASCADE removes child rows). */
  async deleteAllEntitiesForProject(projectId: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteAllEntitiesForProject');
      return false;
    }

    const { error } = await this.client
      .from('entities')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('deleteAllEntitiesForProject error:', error.message);
      return false;
    }

    return true;
  }

  /** Delete all relations belonging to a project. */
  async deleteAllRelationsForProject(projectId: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteAllRelationsForProject');
      return false;
    }

    const { error } = await this.client
      .from('entity_relations')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('deleteAllRelationsForProject error:', error.message);
      return false;
    }

    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Entity Relations                                                 */
  /* ---------------------------------------------------------------- */

  async getRelations(projectId: string): Promise<EntityRelation[]> {
    if (!this.client) {
      this.logNoClient('getRelations');
      return [];
    }

    const { data, error } = await this.client
      .from('entity_relations')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('getRelations error:', error.message);
      return [];
    }

    return (data as EntityRelationRow[]).map(toRelation);
  }

  async createRelation(
    projectId: string,
    relation: EntityRelation,
  ): Promise<EntityRelation | null> {
    if (!this.client) {
      this.logNoClient('createRelation');
      return null;
    }

    const { data, error } = await this.client
      .from('entity_relations')
      .insert({
        id: relation.id,
        project_id: projectId,
        source_entity_id: relation.sourceEntityId,
        target_entity_id: relation.targetEntityId,
        type: relation.type,
        field_name: relation.fieldName,
        description: relation.description ?? '',
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createRelation error:', error.message);
      return null;
    }

    return toRelation(data as EntityRelationRow);
  }

  async updateRelation(
    id: string,
    updates: Partial<EntityRelation>,
  ): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updateRelation');
      return false;
    }

    const { error } = await this.client
      .from('entity_relations')
      .update({
        source_entity_id: updates.sourceEntityId,
        target_entity_id: updates.targetEntityId,
        type: updates.type,
        field_name: updates.fieldName,
        description: updates.description,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updateRelation error:', error.message);
      return false;
    }

    return true;
  }

  async deleteRelation(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteRelation');
      return false;
    }

    const { error } = await this.client
      .from('entity_relations')
      .delete()
      .eq('id', id);

    if (error) {
      dbLogger.error('deleteRelation error:', error.message);
      return false;
    }

    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Middlewares                                                      */
  /* ---------------------------------------------------------------- */

  async getMiddlewares(projectId: string): Promise<MiddlewareConfig[]> {
    if (!this.client) {
      this.logNoClient('getMiddlewares');
      return [];
    }

    const { data, error } = await this.client
      .from('middlewares')
      .select('*')
      .eq('project_id', projectId)
      .order('order', { ascending: true });

    if (error) {
      dbLogger.error('getMiddlewares error:', error.message);
      return [];
    }

    return (data as MiddlewareRow[]).map(toMiddleware);
  }

  async createMiddleware(
    projectId: string,
    middleware: MiddlewareConfig,
  ): Promise<MiddlewareConfig | null> {
    if (!this.client) {
      this.logNoClient('createMiddleware');
      return null;
    }

    const { data, error } = await this.client
      .from('middlewares')
      .insert({
        id: middleware.id,
        project_id: projectId,
        name: middleware.name,
        description: middleware.description,
        enabled: middleware.enabled,
        order: middleware.order,
        scope: middleware.scope,
        is_preset: middleware.isPreset,
        code: middleware.code,
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createMiddleware error:', error.message);
      return null;
    }

    return toMiddleware(data as MiddlewareRow);
  }

  async updateMiddleware(
    id: string,
    updates: Partial<MiddlewareConfig>,
  ): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updateMiddleware');
      return false;
    }

    const { error } = await this.client
      .from('middlewares')
      .update({
        name: updates.name,
        description: updates.description,
        enabled: updates.enabled,
        order: updates.order,
        scope: updates.scope,
        is_preset: updates.isPreset,
        code: updates.code,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updateMiddleware error:', error.message);
      return false;
    }

    return true;
  }

  async deleteMiddleware(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteMiddleware');
      return false;
    }

    const { error } = await this.client
      .from('middlewares')
      .delete()
      .eq('id', id);

    if (error) {
      dbLogger.error('deleteMiddleware error:', error.message);
      return false;
    }

    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Services                                                         */
  /* ---------------------------------------------------------------- */

  async getServices(projectId: string): Promise<ServiceConfig[]> {
    if (!this.client) {
      this.logNoClient('getServices');
      return [];
    }

    const { data, error } = await this.client
      .from('services')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('getServices error:', error.message);
      return [];
    }

    const rows = data as ServiceRow[];
    return Promise.all(
      rows.map(async row => {
        let methods: ServiceConfig['methods'] = row.methods;
        let dependencies: ServiceConfig['dependencies'] = row.dependencies;

        try {
          const [normalizedMethods, normalizedDeps] = await Promise.all([
            this.getServiceMethods(row.id),
            this.getServiceDependencies(row.id),
          ]);
          if (normalizedMethods.length > 0) methods = normalizedMethods;
          if (normalizedDeps.length > 0) dependencies = normalizedDeps;
        } catch {
          // Fallback to legacy JSONB columns
        }

        return {
          id: row.id,
          name: row.name,
          description: row.description,
          methods,
          healthCheck: row.health_check,
          code: row.code,
          dependencies,
        };
      }),
    );
  }

  async getServiceMethods(
    serviceId: string,
  ): Promise<ServiceConfig['methods']> {
    if (!this.client) {
      this.logNoClient('getServiceMethods');
      return [];
    }

    const { data, error } = await this.client
      .from('service_methods')
      .select('*')
      .eq('service_id', serviceId)
      .order('method_order', { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as ServiceMethodRow[];
    return rows.map(r => ({
      name: r.name,
      description: r.description ?? '',
      // Deprecated field; keep only if present
      entityId: r.entity_id ?? undefined,
      inputType: r.input_type ?? undefined,
      outputType: r.output_type ?? undefined,
      code: r.code ?? undefined,
    }));
  }

  async getServiceDependencies(
    serviceId: string,
  ): Promise<ServiceConfig['dependencies']> {
    if (!this.client) {
      this.logNoClient('getServiceDependencies');
      return [];
    }

    const { data, error } = await this.client
      .from('service_dependencies')
      .select('*')
      .eq('service_id', serviceId)
      .order('dependency_order', { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as ServiceDependencyRow[];
    return rows.map(r => ({
      name: r.name,
      version: r.version,
    }));
  }

  async createService(
    projectId: string,
    service: ServiceConfig,
  ): Promise<ServiceConfig | null> {
    if (!this.client) {
      this.logNoClient('createService');
      return null;
    }

    const { error } = await this.client
      .from('services')
      .insert({
        id: service.id,
        project_id: projectId,
        name: service.name,
        description: service.description,
        health_check: service.healthCheck,
        code: service.code,
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createService error:', error.message);
      return null;
    }

    if (service.methods.length > 0) {
      await this.client.from('service_methods').insert(
        service.methods.map((m, method_order) => ({
          service_id: service.id,
          method_order,
          name: m.name,
          description: m.description ?? '',
          entity_id: m.entityId ?? null,
          input_type: m.inputType ?? null,
          output_type: m.outputType ?? null,
          code: m.code ?? null,
        })),
      );
    }

    if (service.dependencies.length > 0) {
      await this.client.from('service_dependencies').insert(
        service.dependencies.map((d, dependency_order) => ({
          service_id: service.id,
          dependency_order,
          name: d.name,
          version: d.version,
        })),
      );
    }

    return service;
  }

  async updateService(
    id: string,
    updates: Partial<ServiceConfig>,
  ): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updateService');
      return false;
    }

    const { error } = await this.client
      .from('services')
      .update({
        name: updates.name,
        description: updates.description,
        health_check: updates.healthCheck,
        code: updates.code,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updateService error:', error.message);
      return false;
    }

    if (updates.methods) {
      await this.client.from('service_methods').delete().eq('service_id', id);
      if (updates.methods.length > 0) {
        await this.client.from('service_methods').insert(
          updates.methods.map((m, method_order) => ({
            service_id: id,
            method_order,
            name: m.name,
            description: m.description ?? '',
            entity_id: m.entityId ?? null,
            input_type: m.inputType ?? null,
            output_type: m.outputType ?? null,
            code: m.code ?? null,
          })),
        );
      }
    }

    if (updates.dependencies) {
      await this.client
        .from('service_dependencies')
        .delete()
        .eq('service_id', id);
      if (updates.dependencies.length > 0) {
        await this.client.from('service_dependencies').insert(
          updates.dependencies.map((d, dependency_order) => ({
            service_id: id,
            dependency_order,
            name: d.name,
            version: d.version,
          })),
        );
      }
    }

    return true;
  }

  async deleteService(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteService');
      return false;
    }

    const { error } = await this.client.from('services').delete().eq('id', id);

    if (error) {
      dbLogger.error('deleteService error:', error.message);
      return false;
    }

    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Pages                                                            */
  /* ---------------------------------------------------------------- */

  async getPages(projectId: string): Promise<UIPage[]> {
    if (!this.client) {
      this.logNoClient('getPages');
      return [];
    }

    const { data, error } = await this.client
      .from('pages')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('getPages error:', error.message);
      return [];
    }

    const rows = data as PageRow[];
    return Promise.all(
      rows.map(async row => {
        let components: UIPage['components'] = row.components;
        try {
          const normalized = await this.getPageComponents(row.id);
          if (normalized.length > 0) components = normalized;
        } catch {
          // Legacy JSONB fallback
        }

        return {
          id: row.id,
          path: row.path,
          name: row.name,
          description: row.description,
          components,
        };
      }),
    );
  }

  async getPageComponents(pageId: string): Promise<UIPage['components']> {
    if (!this.client) {
      this.logNoClient('getPageComponents');
      return [];
    }

    const { data: componentData, error: compError } = await this.client
      .from('page_components')
      .select('*')
      .eq('page_id', pageId)
      .order('order', { ascending: true });

    if (compError) throw compError;

    const components = (componentData ?? []) as PageComponentRow[];
    if (components.length === 0) return [];

    const componentIds = components.map(c => c.id);

    const { data: visibleData, error: visibleError } = await this.client
      .from('page_component_visible_fields')
      .select('*')
      .in('page_component_id', componentIds);

    if (visibleError) throw visibleError;

    const visibleRows = (visibleData ?? []) as PageComponentVisibleFieldRow[];
    const visibleByComponent = new Map<
      string,
      { visible_field_order: number; field_name: string }[]
    >();
    visibleRows.forEach(r => {
      const arr = visibleByComponent.get(r.page_component_id) ?? [];
      arr.push({
        visible_field_order: r.visible_field_order,
        field_name: r.field_name,
      });
      visibleByComponent.set(r.page_component_id, arr);
    });
    visibleByComponent.forEach(arr =>
      arr.sort((a, b) => a.visible_field_order - b.visible_field_order),
    );

    const { data: linkedData, error: linkedError } = await this.client
      .from('page_component_linked_components')
      .select('*')
      .in('page_component_id', componentIds);

    if (linkedError) throw linkedError;

    const linkedRows = (linkedData ?? []) as PageComponentLinkedComponentRow[];
    const linkedByComponent = new Map<
      string,
      { linked_component_order: number; linked_component_id: string }[]
    >();
    linkedRows.forEach(r => {
      const arr = linkedByComponent.get(r.page_component_id) ?? [];
      arr.push({
        linked_component_order: r.linked_component_order,
        linked_component_id: r.linked_component_id,
      });
      linkedByComponent.set(r.page_component_id, arr);
    });
    linkedByComponent.forEach(arr =>
      arr.sort((a, b) => a.linked_component_order - b.linked_component_order),
    );

    return components.map(c => {
      const visibleArr = visibleByComponent.get(c.id) ?? [];
      const visibleFields = visibleArr.map(v => v.field_name);

      const linkedArr = linkedByComponent.get(c.id) ?? [];
      const linkedComponentIds = linkedArr.map(l => l.linked_component_id);

      return {
        id: c.id,
        template: c.template,
        title: c.title,
        entityId: c.entity_id,
        relationId: c.relation_id,
        slot: c.slot,
        order: c.order,
        position: { x: c.position_x, y: c.position_y },
        size: { width: c.size_width, height: c.size_height },
        visibleFields,
        linkedComponentIds:
          linkedComponentIds.length > 0 ? linkedComponentIds : undefined,
        linkedSubmitButtonId: c.linked_submit_button_id ?? undefined,
        submitAction: c.submit_action ?? undefined,
        props: (c.props ?? {}) as Record<string, unknown>,
      };
    });
  }

  async createPage(projectId: string, page: UIPage): Promise<UIPage | null> {
    if (!this.client) {
      this.logNoClient('createPage');
      return null;
    }

    const { error } = await this.client
      .from('pages')
      .insert({
        id: page.id,
        project_id: projectId,
        path: page.path,
        name: page.name,
        description: page.description ?? '',
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createPage error:', error.message);
      return null;
    }

    if (page.components.length > 0) {
      await this.client.from('page_components').insert(
        page.components.map(c => ({
          id: c.id,
          page_id: page.id,
          template: c.template,
          title: c.title,
          entity_id: c.entityId ?? null,
          relation_id: c.relationId ?? null,
          slot: c.slot,
          order: c.order,
          position_x: c.position.x,
          position_y: c.position.y,
          size_width: c.size.width,
          size_height: c.size.height,
          linked_submit_button_id: c.linkedSubmitButtonId ?? null,
          submit_action: c.submitAction ?? null,
          props: c.props ?? {},
        })),
      );

      const visibleRows = page.components.flatMap(c =>
        (c.visibleFields ?? []).map((field_name, visible_field_order) => ({
          page_component_id: c.id,
          visible_field_order,
          field_name,
        })),
      );
      if (visibleRows.length > 0) {
        await this.client
          .from('page_component_visible_fields')
          .insert(visibleRows);
      }

      const linkedRows = page.components.flatMap(c =>
        (c.linkedComponentIds ?? []).map(
          (linked_component_id, linked_component_order) => ({
            page_component_id: c.id,
            linked_component_order,
            linked_component_id,
          }),
        ),
      );
      if (linkedRows.length > 0) {
        await this.client
          .from('page_component_linked_components')
          .insert(linkedRows);
      }
    }

    return page;
  }

  async updatePage(id: string, updates: Partial<UIPage>): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updatePage');
      return false;
    }

    const { error } = await this.client
      .from('pages')
      .update({
        path: updates.path,
        name: updates.name,
        description: updates.description,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updatePage error:', error.message);
      return false;
    }

    if (updates.components) {
      await this.client.from('page_components').delete().eq('page_id', id);

      await this.client.from('page_components').insert(
        updates.components.map(c => ({
          id: c.id,
          page_id: id,
          template: c.template,
          title: c.title,
          entity_id: c.entityId ?? null,
          relation_id: c.relationId ?? null,
          slot: c.slot,
          order: c.order,
          position_x: c.position.x,
          position_y: c.position.y,
          size_width: c.size.width,
          size_height: c.size.height,
          linked_submit_button_id: c.linkedSubmitButtonId ?? null,
          submit_action: c.submitAction ?? null,
          props: c.props ?? {},
        })),
      );

      const visibleRows = updates.components.flatMap(c =>
        (c.visibleFields ?? []).map((field_name, visible_field_order) => ({
          page_component_id: c.id,
          visible_field_order,
          field_name,
        })),
      );
      if (visibleRows.length > 0) {
        await this.client
          .from('page_component_visible_fields')
          .insert(visibleRows);
      }

      const linkedRows = updates.components.flatMap(c =>
        (c.linkedComponentIds ?? []).map(
          (linked_component_id, linked_component_order) => ({
            page_component_id: c.id,
            linked_component_order,
            linked_component_id,
          }),
        ),
      );
      if (linkedRows.length > 0) {
        await this.client
          .from('page_component_linked_components')
          .insert(linkedRows);
      }
    }

    return true;
  }

  async deletePage(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deletePage');
      return false;
    }

    const { error } = await this.client.from('pages').delete().eq('id', id);

    if (error) {
      dbLogger.error('deletePage error:', error.message);
      return false;
    }

    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  API Paths                                                        */
  /* ---------------------------------------------------------------- */

  async getApiPaths(projectId: string): Promise<ApiPath[]> {
    if (!this.client) {
      this.logNoClient('getApiPaths');
      return [];
    }

    const { data, error } = await this.client
      .from('api_paths')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('getApiPaths error:', error.message);
      return [];
    }

    const rows = data as ApiPathRow[];
    return Promise.all(
      rows.map(async row => {
        let operations: ApiPath['operations'] = row.operations;
        try {
          const normalized = await this.getApiPathOperations(row.id);
          if (normalized.length > 0) operations = normalized;
        } catch {
          // Legacy JSONB fallback
        }

        return {
          id: row.id,
          path: row.path,
          description: row.description,
          operations,
        };
      }),
    );
  }

  async getApiPathOperations(
    apiPathId: string,
  ): Promise<ApiPath['operations']> {
    if (!this.client) {
      this.logNoClient('getApiPathOperations');
      return [];
    }

    const { data: operationData, error: opError } = await this.client
      .from('api_path_operations')
      .select('*')
      .eq('api_path_id', apiPathId)
      .order('operation_order', { ascending: true });

    if (opError) throw opError;

    const operations = (operationData ?? []) as ApiPathOperationRow[];
    if (operations.length === 0) return [];

    const operationIds = operations.map(o => o.id);

    const { data: middlewareData, error: middlewareError } = await this.client
      .from('api_path_operation_middleware_ids')
      .select('*')
      .in('operation_id', operationIds);

    if (middlewareError) throw middlewareError;

    const middlewareRows = (middlewareData ??
      []) as ApiPathOperationMiddlewareIdRow[];
    const middlewareByOperation = new Map<
      string,
      { middleware_order: number; middleware_id: string }[]
    >();
    middlewareRows.forEach(r => {
      const arr = middlewareByOperation.get(r.operation_id) ?? [];
      arr.push({
        middleware_order: r.middleware_order,
        middleware_id: r.middleware_id,
      });
      middlewareByOperation.set(r.operation_id, arr);
    });
    middlewareByOperation.forEach(arr =>
      arr.sort((a, b) => a.middleware_order - b.middleware_order),
    );

    const { data: tagData, error: tagError } = await this.client
      .from('api_path_operation_tags')
      .select('*')
      .in('operation_id', operationIds);

    if (tagError) throw tagError;

    const tagRows = (tagData ?? []) as ApiPathOperationTagRow[];
    const tagsByOperation = new Map<
      string,
      { tag_order: number; tag: string }[]
    >();
    tagRows.forEach(r => {
      const arr = tagsByOperation.get(r.operation_id) ?? [];
      arr.push({ tag_order: r.tag_order, tag: r.tag });
      tagsByOperation.set(r.operation_id, arr);
    });
    tagsByOperation.forEach(arr =>
      arr.sort((a, b) => a.tag_order - b.tag_order),
    );

    return operations.map(o => {
      const middlewareArr = middlewareByOperation.get(o.id) ?? [];
      const middlewareIds = middlewareArr.map(m => m.middleware_id);
      const tagArr = tagsByOperation.get(o.id) ?? [];
      const tags = tagArr.map(t => t.tag);

      return {
        id: o.id,
        method: o.method,
        summary: o.summary,
        description: o.description ?? undefined,
        inputType: o.input_type ?? undefined,
        outputType: o.output_type ?? undefined,
        middlewareIds,
        tags,
      };
    });
  }

  async createApiPath(
    projectId: string,
    apiPath: ApiPath,
  ): Promise<ApiPath | null> {
    if (!this.client) {
      this.logNoClient('createApiPath');
      return null;
    }

    const { error } = await this.client
      .from('api_paths')
      .insert({
        id: apiPath.id,
        project_id: projectId,
        path: apiPath.path,
        description: apiPath.description ?? '',
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createApiPath error:', error.message);
      return null;
    }

    if (apiPath.operations.length > 0) {
      await this.client.from('api_path_operations').insert(
        apiPath.operations.map((op, operation_order) => ({
          id: op.id,
          api_path_id: apiPath.id,
          operation_order,
          method: op.method,
          summary: op.summary,
          description: op.description ?? '',
          input_type: op.inputType ?? null,
          output_type: op.outputType ?? null,
        })),
      );

      const tagRows = apiPath.operations.flatMap(op =>
        (op.tags ?? []).map((tag, tag_order) => ({
          operation_id: op.id,
          tag_order,
          tag,
        })),
      );
      if (tagRows.length > 0) {
        await this.client.from('api_path_operation_tags').insert(tagRows);
      }

      const middlewareIdRows = apiPath.operations.flatMap(op =>
        (op.middlewareIds ?? []).map((middleware_id, middleware_order) => ({
          operation_id: op.id,
          middleware_order,
          middleware_id,
        })),
      );
      if (middlewareIdRows.length > 0) {
        await this.client
          .from('api_path_operation_middleware_ids')
          .insert(middlewareIdRows);
      }
    }

    return apiPath;
  }

  async updateApiPath(id: string, updates: Partial<ApiPath>): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updateApiPath');
      return false;
    }

    const { error } = await this.client
      .from('api_paths')
      .update({
        path: updates.path,
        description: updates.description,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updateApiPath error:', error.message);
      return false;
    }

    if (updates.operations) {
      await this.client
        .from('api_path_operations')
        .delete()
        .eq('api_path_id', id);

      await this.client.from('api_path_operations').insert(
        updates.operations.map((op, operation_order) => ({
          id: op.id,
          api_path_id: id,
          operation_order,
          method: op.method,
          summary: op.summary,
          description: op.description ?? '',
          input_type: op.inputType ?? null,
          output_type: op.outputType ?? null,
        })),
      );

      const tagRows = updates.operations.flatMap(op =>
        (op.tags ?? []).map((tag, tag_order) => ({
          operation_id: op.id,
          tag_order,
          tag,
        })),
      );
      if (tagRows.length > 0) {
        await this.client.from('api_path_operation_tags').insert(tagRows);
      }

      const middlewareIdRows = updates.operations.flatMap(op =>
        (op.middlewareIds ?? []).map((middleware_id, middleware_order) => ({
          operation_id: op.id,
          middleware_order,
          middleware_id,
        })),
      );
      if (middlewareIdRows.length > 0) {
        await this.client
          .from('api_path_operation_middleware_ids')
          .insert(middlewareIdRows);
      }
    }

    return true;
  }

  async deleteApiPath(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteApiPath');
      return false;
    }

    const { error } = await this.client.from('api_paths').delete().eq('id', id);

    if (error) {
      dbLogger.error('deleteApiPath error:', error.message);
      return false;
    }

    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Pipelines                                                        */
  /* ---------------------------------------------------------------- */

  async getPipelines(projectId: string): Promise<Pipeline[]> {
    if (!this.client) {
      this.logNoClient('getPipelines');
      return [];
    }

    const { data, error } = await this.client
      .from('pipelines')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('getPipelines error:', error.message);
      return [];
    }

    const rows = data as PipelineRow[];
    return Promise.all(
      rows.map(async row => {
        let steps: Pipeline['steps'] = row.steps;
        try {
          const normalized = await this.getPipelineSteps(row.id);
          if (normalized.length > 0) steps = normalized;
        } catch {
          // Legacy JSONB fallback
        }

        return {
          id: row.id,
          name: row.name,
          description: row.description,
          steps,
        };
      }),
    );
  }

  async getPipelineSteps(pipelineId: string): Promise<PipelineStep[]> {
    if (!this.client) {
      this.logNoClient('getPipelineSteps');
      return [];
    }

    const { data, error } = await this.client
      .from('pipeline_steps')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('step_order', { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as PipelineStepRow[];
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      name: r.name,
      description: r.description ?? '',
      botId: r.bot_id ?? undefined,
      code: r.code ?? undefined,
      config: r.config ?? {},
      order: r.step_order,
    }));
  }

  async createPipeline(
    projectId: string,
    pipeline: Pipeline,
  ): Promise<Pipeline | null> {
    if (!this.client) {
      this.logNoClient('createPipeline');
      return null;
    }

    const { error } = await this.client
      .from('pipelines')
      .insert({
        id: pipeline.id,
        project_id: projectId,
        name: pipeline.name,
        description: pipeline.description ?? '',
        // Steps are stored in the normalized pipeline_steps table
        steps: [],
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createPipeline error:', error.message);
      return null;
    }

    // Insert normalized pipeline steps
    if (pipeline.steps.length > 0) {
      await this.client.from('pipeline_steps').insert(
        pipeline.steps.map(step => ({
          id: step.id,
          pipeline_id: pipeline.id,
          step_order: step.order,
          type: step.type,
          name: step.name,
          description: step.description ?? '',
          bot_id: step.botId ?? null,
          code: step.code ?? null,
          config: step.config ?? {},
        })),
      );
    }

    return pipeline;
  }

  async updatePipeline(
    id: string,
    updates: Partial<Pipeline>,
  ): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updatePipeline');
      return false;
    }

    const { error } = await this.client
      .from('pipelines')
      .update({
        name: updates.name,
        description: updates.description,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updatePipeline error:', error.message);
      return false;
    }

    // Replace steps in the normalized table
    if (updates.steps) {
      await this.client.from('pipeline_steps').delete().eq('pipeline_id', id);

      if (updates.steps.length > 0) {
        await this.client.from('pipeline_steps').insert(
          updates.steps.map(step => ({
            id: step.id,
            pipeline_id: id,
            step_order: step.order,
            type: step.type,
            name: step.name,
            description: step.description ?? '',
            bot_id: step.botId ?? null,
            code: step.code ?? null,
            config: step.config ?? {},
          })),
        );
      }
    }

    return true;
  }

  async deletePipeline(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deletePipeline');
      return false;
    }

    const { error } = await this.client.from('pipelines').delete().eq('id', id);

    if (error) {
      dbLogger.error('deletePipeline error:', error.message);
      return false;
    }

    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  Bots                                                             */
  /* ---------------------------------------------------------------- */

  async getBots(projectId: string): Promise<Bot[]> {
    if (!this.client) {
      this.logNoClient('getBots');
      return [];
    }

    const { data, error } = await this.client
      .from('bots')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      dbLogger.error('getBots error:', error.message);
      return [];
    }

    return (data as BotRow[]).map(toBot);
  }

  async createBot(projectId: string, bot: Bot): Promise<Bot | null> {
    if (!this.client) {
      this.logNoClient('createBot');
      return null;
    }

    const { data, error } = await this.client
      .from('bots')
      .insert({
        id: bot.id,
        project_id: projectId,
        name: bot.name,
        description: bot.description ?? '',
        type: bot.type,
        instructions: bot.instructions ?? '',
        config: bot.config,
      })
      .select()
      .single();

    if (error) {
      dbLogger.error('createBot error:', error.message);
      return null;
    }

    return toBot(data as BotRow);
  }

  async updateBot(id: string, updates: Partial<Bot>): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('updateBot');
      return false;
    }

    const { error } = await this.client
      .from('bots')
      .update({
        name: updates.name,
        description: updates.description,
        type: updates.type,
        instructions: updates.instructions,
        config: updates.config,
      })
      .eq('id', id);

    if (error) {
      dbLogger.error('updateBot error:', error.message);
      return false;
    }

    return true;
  }

  async deleteBot(id: string): Promise<boolean> {
    if (!this.client) {
      this.logNoClient('deleteBot');
      return false;
    }

    const { error } = await this.client.from('bots').delete().eq('id', id);

    if (error) {
      dbLogger.error('deleteBot error:', error.message);
      return false;
    }

    return true;
  }
}

/* ------------------------------------------------------------------ */
/*  Export singleton instance                                          */
/* ------------------------------------------------------------------ */

export const supabaseDb = new SupabaseDbService();

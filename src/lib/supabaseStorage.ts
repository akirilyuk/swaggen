/**
 * Zustand `persist` storage adapter backed exclusively by Supabase.
 *
 * Domain data is stored in normalised tables (`projects`, `entities`, etc.)
 * and a lightweight `store_state_meta` row tracks the active project ID and
 * project ID list.
 *
 * Individual entity/service/page/etc writes are handled by granular
 * `supabaseDb` calls in each store action. This adapter only reads
 * the full state on startup and writes the meta row on every state change.
 */
import type { StateStorage } from 'zustand/middleware';

import type { Project } from '@/types/project';

import { fetchAccountIdForUser } from '@/lib/accountLookup';

import { getSupabaseClient } from './supabase';
import { supabaseDb } from './supabaseDb';

/** Resolve `accounts.id` for the signed-in user (avoids circular imports). */
async function getAccountIdForCurrentUser(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require('@/store/authStore');
    const user = useAuthStore.getState().user as { id: string } | null;
    if (!user) return null;
    return fetchAccountIdForUser(user.id);
  } catch {
    return null;
  }
}

/** Supabase Auth user id — required for store_state_meta RLS (migration 006). */
function getAuthUserIdForMeta(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require('@/store/authStore');
    return useAuthStore.getState().user?.id ?? null;
  } catch {
    return null;
  }
}

const META_TABLE = 'store_state_meta';
// Keep this in sync with `version: 3` in `src/store/projectStore.ts`
const PERSIST_VERSION = 3;

export const supabaseStorage: StateStorage = {
  /**
   * Read state from Supabase.
   * Returns `null` when no Supabase client is configured (the store will
   * start with its default empty state).
   */
  getItem: async (key: string): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn(
        '[supabaseStorage] No Supabase client configured — starting with empty state',
      );
      return null;
    }

    try {
      const { data: meta, error: metaError } = await supabase
        .from(META_TABLE)
        .select('active_project_id, project_ids')
        .eq('key', key)
        .maybeSingle();

      if (metaError) {
        console.error('[supabaseStorage] read meta error:', metaError.message);
        return null;
      }

      const projectIds = (meta?.project_ids ?? []) as unknown as string[];

      if (projectIds.length === 0) {
        // Try the legacy kv_store blob (one-time migration).
        try {
          const { data: kvRow } = await supabase
            .from('kv_store')
            .select('value')
            .eq('key', key)
            .maybeSingle();

          const legacy = kvRow?.value;
          if (legacy != null) {
            const legacyParsed =
              typeof legacy === 'string' ? JSON.parse(legacy) : legacy;
            const legacyState = legacyParsed?.state ?? legacyParsed ?? {};
            const legacyProjects = (legacyState.projects ?? []) as Project[];
            const legacyActiveProjectId = legacyState.activeProjectId ?? null;

            if (legacyProjects.length > 0) {
              console.log(
                '[supabaseStorage] Migrating legacy kv_store data to normalised tables',
              );
              await migrateFullStateToSupabase(
                key,
                legacyProjects,
                legacyActiveProjectId,
              );
            }
          }
        } catch (err) {
          console.warn(
            '[supabaseStorage] legacy kv_store migration skipped:',
            err,
          );
        }

        // Re-read after migration attempt (or return empty state if none).
        const { data: refreshedMeta } = await supabase
          .from(META_TABLE)
          .select('active_project_id, project_ids')
          .eq('key', key)
          .maybeSingle();

        const refreshedProjectIds = (refreshedMeta?.project_ids ??
          []) as unknown as string[];
        const refreshedActiveProjectId =
          refreshedMeta?.active_project_id ?? null;
        let projects = await fetchProjectsForIds(refreshedProjectIds);
        let activeProjectId = refreshedActiveProjectId;

        // Recovery path: if meta is empty/stale but projects exist in DB,
        // rebuild meta so existing projects become visible in the UI.
        if (projects.length === 0) {
          const recovered = await fetchAllOwnedProjects();
          if (recovered.length > 0) {
            projects = recovered;
            activeProjectId = recovered[0]?.id ?? null;
            await syncMetaToSupabase(
              key,
              recovered,
              refreshedActiveProjectId ?? activeProjectId,
            );
          }
        }

        return JSON.stringify({
          state: { projects, activeProjectId },
          version: PERSIST_VERSION,
        });
      }

      const activeProjectId = meta?.active_project_id ?? null;
      const projects = await fetchProjectsForIds(projectIds);

      return JSON.stringify({
        state: { projects, activeProjectId },
        version: PERSIST_VERSION,
      });
    } catch (err) {
      console.error('[supabaseStorage] unexpected error during getItem:', err);
      return null;
    }
  },

  /**
   * Write state: Supabase meta-only.
   *
   * Individual entity/service/page/etc writes are handled by granular
   * `supabaseDb` calls in each store action. This method only updates
   * the lightweight `store_state_meta` row (active project, project IDs)
   * and deletes any projects that were removed from the store.
   */
  setItem: async (key: string, value: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn(
        '[supabaseStorage] No Supabase client, skipping remote write',
      );
      return;
    }

    try {
      const parsed = JSON.parse(value) as {
        state?: {
          projects?: Project[];
          activeProjectId?: string | null;
        };
      };

      const state = parsed?.state ?? {};
      const projects = (state.projects ?? []) as Project[];
      const activeProjectId = state.activeProjectId ?? null;

      await syncMetaToSupabase(key, projects, activeProjectId);
    } catch (err) {
      console.error('[supabaseStorage] unexpected error during setItem:', err);
    }
  },

  /**
   * Remove state from Supabase.
   */
  removeItem: async (key: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: meta, error: metaError } = await supabase
        .from(META_TABLE)
        .select('project_ids')
        .eq('key', key)
        .maybeSingle();

      if (!metaError && meta?.project_ids?.length) {
        await supabase.from('projects').delete().in('id', meta.project_ids);
      }

      const { error: metaDelError } = await supabase
        .from(META_TABLE)
        .delete()
        .eq('key', key);

      if (metaDelError) {
        console.error(
          '[supabaseStorage] meta delete error:',
          metaDelError.message,
        );
      }
    } catch (err) {
      console.error(
        '[supabaseStorage] unexpected error during removeItem:',
        err,
      );
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function fetchProjectsForIds(projectIds: string[]): Promise<Project[]> {
  const found = await Promise.all(
    projectIds.map(id => supabaseDb.getProject(id)),
  );

  return found.filter((p): p is Project => Boolean(p));
}

async function fetchAllOwnedProjects(): Promise<Project[]> {
  return supabaseDb.getProjects();
}

/* ------------------------------------------------------------------ */
/*  Lightweight meta-only sync (used by setItem)                       */
/* ------------------------------------------------------------------ */

/**
 * Only updates the `store_state_meta` row and handles project deletions.
 * The actual domain data (entities, services, pages, etc.) is written
 * by granular `supabaseDb` calls in each store action.
 */
async function syncMetaToSupabase(
  key: string,
  projects: Project[],
  activeProjectId: string | null,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const nextProjectIds = projects.map(p => p.id);

  // Load previous project IDs to detect deletions
  const { data: prevMeta } = await supabase
    .from(META_TABLE)
    .select('project_ids')
    .eq('key', key)
    .maybeSingle();

  const prevProjectIds = (prevMeta?.project_ids ?? []) as unknown as string[];

  const removedProjectIds = prevProjectIds.filter(
    id => !nextProjectIds.includes(id),
  );

  // Remove deleted projects (CASCADE removes all children)
  if (removedProjectIds.length > 0) {
    console.log(
      '[supabaseStorage] Removing deleted projects:',
      removedProjectIds,
    );
    await supabase.from('projects').delete().in('id', removedProjectIds);
  }

  // Upsert the meta row (user_id + account_id for RLS)
  const accountId = await getAccountIdForCurrentUser();
  const userId = getAuthUserIdForMeta();
  await supabase.from(META_TABLE).upsert(
    {
      key,
      user_id: userId,
      account_id: accountId,
      active_project_id: activeProjectId,
      project_ids: nextProjectIds,
    },
    { onConflict: 'key' },
  );
}

/* ------------------------------------------------------------------ */
/*  Full state migration (used ONLY during initial getItem migration)  */
/* ------------------------------------------------------------------ */

/**
 * Writes the ENTIRE state to Supabase (destructive delete + reinsert).
 *
 * This is intentionally expensive and is ONLY called during migration
 * from the legacy kv_store blob.
 *
 * Normal operation uses granular `supabaseDb` calls from store actions.
 */
async function migrateFullStateToSupabase(
  key: string,
  projects: Project[],
  activeProjectId: string | null,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: prevMeta } = await supabase
    .from(META_TABLE)
    .select('project_ids')
    .eq('key', key)
    .maybeSingle();

  const prevProjectIds = (prevMeta?.project_ids ?? []) as unknown as string[];
  const nextProjectIds = projects.map(p => p.id);

  const removedProjectIds = prevProjectIds.filter(
    id => !nextProjectIds.includes(id),
  );

  if (removedProjectIds.length > 0) {
    await supabase.from('projects').delete().in('id', removedProjectIds);
  }

  // For remaining/updated projects, delete child rows and re-insert from state
  if (nextProjectIds.length > 0) {
    await supabase.from('entities').delete().in('project_id', nextProjectIds);
    await supabase
      .from('entity_relations')
      .delete()
      .in('project_id', nextProjectIds);
    await supabase.from('services').delete().in('project_id', nextProjectIds);
    await supabase.from('pages').delete().in('project_id', nextProjectIds);
    await supabase.from('api_paths').delete().in('project_id', nextProjectIds);
    await supabase.from('pipelines').delete().in('project_id', nextProjectIds);
    await supabase
      .from('middlewares')
      .delete()
      .in('project_id', nextProjectIds);
    await supabase.from('bots').delete().in('project_id', nextProjectIds);
  }

  const migrationAccountId = await getAccountIdForCurrentUser();
  const migrationUserId = getAuthUserIdForMeta();
  const projectRows = projects.map(p => ({
    id: p.id,
    user_id: p.userId ?? migrationUserId,
    account_id: p.accountId ?? migrationAccountId,
    name: p.name,
    description: p.description ?? '',
    open_api_spec: p.openApiSpec,
    data_storage: p.dataStorage,
    git_repo: p.gitRepo,
  }));
  if (projectRows.length > 0) {
    await supabase.from('projects').upsert(projectRows, { onConflict: 'id' });
  }

  if (projects.length > 0) {
    const middlewareRows = projects.flatMap(p =>
      p.middlewares.map(mw => ({
        id: mw.id,
        project_id: p.id,
        name: mw.name,
        description: mw.description ?? '',
        enabled: mw.enabled,
        order: mw.order,
        scope: mw.scope,
        is_preset: mw.isPreset,
        code: mw.code,
      })),
    );

    const botRows = projects.flatMap(p =>
      p.bots.map(b => ({
        id: b.id,
        project_id: p.id,
        name: b.name,
        description: b.description ?? '',
        type: b.type,
        instructions: b.instructions ?? '',
        config: b.config,
      })),
    );

    const entityRows = projects.flatMap(p =>
      p.entities.map(e => ({
        id: e.id,
        project_id: p.id,
        name: e.name,
        description: e.description ?? '',
        fields: [],
        middleware_bindings: [],
      })),
    );

    const relationRows = projects.flatMap(p =>
      p.relations.map(r => ({
        id: r.id,
        project_id: p.id,
        source_entity_id: r.sourceEntityId,
        target_entity_id: r.targetEntityId,
        type: r.type,
        field_name: r.fieldName,
        description: r.description ?? '',
      })),
    );

    const serviceRows = projects.flatMap(p =>
      p.services.map(svc => ({
        id: svc.id,
        project_id: p.id,
        name: svc.name,
        description: svc.description ?? '',
        methods: [],
        health_check: svc.healthCheck ?? null,
        code: svc.code,
        dependencies: [],
      })),
    );

    const pageRows = projects.flatMap(p =>
      p.pages.map(pg => ({
        id: pg.id,
        project_id: p.id,
        path: pg.path,
        name: pg.name,
        description: pg.description ?? '',
        components: [],
      })),
    );

    const apiPathRows = projects.flatMap(p =>
      p.apiPaths.map(ap => ({
        id: ap.id,
        project_id: p.id,
        path: ap.path,
        description: ap.description ?? '',
        operations: [],
      })),
    );

    const pipelineRows = projects.flatMap(p =>
      p.pipelines.map(pl => ({
        id: pl.id,
        project_id: p.id,
        name: pl.name,
        description: pl.description ?? '',
        steps: [],
      })),
    );

    if (middlewareRows.length > 0) {
      await supabase
        .from('middlewares')
        .upsert(middlewareRows, { onConflict: 'id' });
    }
    if (botRows.length > 0) {
      await supabase.from('bots').upsert(botRows, { onConflict: 'id' });
    }
    if (entityRows.length > 0) {
      await supabase.from('entities').upsert(entityRows, { onConflict: 'id' });
    }
    if (relationRows.length > 0) {
      await supabase
        .from('entity_relations')
        .upsert(relationRows, { onConflict: 'id' });
    }
    if (serviceRows.length > 0) {
      await supabase.from('services').upsert(serviceRows, { onConflict: 'id' });
    }
    if (pageRows.length > 0) {
      await supabase.from('pages').upsert(pageRows, { onConflict: 'id' });
    }
    if (apiPathRows.length > 0) {
      await supabase
        .from('api_paths')
        .upsert(apiPathRows, { onConflict: 'id' });
    }
    if (pipelineRows.length > 0) {
      await supabase
        .from('pipelines')
        .upsert(pipelineRows, { onConflict: 'id' });
    }

    // Insert nested arrays into child tables
    const entityFieldRows = projects.flatMap(p =>
      p.entities.flatMap(e =>
        e.fields.map((f, field_order) => ({
          entity_id: e.id,
          field_order,
          name: f.name,
          type: f.type,
          required: f.required,
          description: f.description ?? '',
          default_value: f.defaultValue ?? null,
        })),
      ),
    );

    const entityFieldEnumRows = projects.flatMap(p =>
      p.entities.flatMap(e =>
        e.fields.flatMap((f, field_order) => {
          if (f.type !== 'enum' || !f.enumValues?.length) return [];
          return f.enumValues.map((val, enum_order) => ({
            entity_id: e.id,
            field_order,
            enum_order,
            value: val,
          }));
        }),
      ),
    );

    const entityMiddlewareBindingRows = projects.flatMap(p =>
      p.entities.flatMap(e =>
        e.middlewareBindings.map((b, binding_order) => ({
          entity_id: e.id,
          binding_order,
          middleware_id: b.middlewareId,
        })),
      ),
    );

    const entityMiddlewareBindingMethodRows = projects.flatMap(p =>
      p.entities.flatMap(e =>
        e.middlewareBindings.flatMap((b, binding_order) =>
          b.methods.map((method, method_order) => ({
            entity_id: e.id,
            binding_order,
            method_order,
            method,
          })),
        ),
      ),
    );

    const serviceMethodRows = projects.flatMap(p =>
      p.services.flatMap(svc =>
        svc.methods.map((m, method_order) => ({
          service_id: svc.id,
          method_order,
          name: m.name,
          description: m.description ?? '',
          entity_id: m.entityId ?? null,
          input_type: m.inputType ?? null,
          output_type: m.outputType ?? null,
          code: m.code ?? null,
        })),
      ),
    );

    const serviceDependencyRows = projects.flatMap(p =>
      p.services.flatMap(svc =>
        svc.dependencies.map((d, dependency_order) => ({
          service_id: svc.id,
          dependency_order,
          name: d.name,
          version: d.version,
        })),
      ),
    );

    const pageComponentRows = projects.flatMap(p =>
      p.pages.flatMap(pg =>
        pg.components.map(c => ({
          id: c.id,
          page_id: pg.id,
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
      ),
    );

    const pageVisibleFieldRows = projects.flatMap(p =>
      p.pages.flatMap(pg =>
        pg.components.flatMap(c =>
          (c.visibleFields ?? []).map((field_name, visible_field_order) => ({
            page_component_id: c.id,
            visible_field_order,
            field_name,
          })),
        ),
      ),
    );

    const pageLinkedComponentRows = projects.flatMap(p =>
      p.pages.flatMap(pg =>
        pg.components.flatMap(c =>
          (c.linkedComponentIds ?? []).map(
            (linked_component_id, linked_component_order) => ({
              page_component_id: c.id,
              linked_component_order,
              linked_component_id,
            }),
          ),
        ),
      ),
    );

    const apiPathOperationRows = projects.flatMap(p =>
      p.apiPaths.flatMap(ap =>
        ap.operations.map((op, operation_order) => ({
          id: op.id,
          api_path_id: ap.id,
          operation_order,
          method: op.method,
          summary: op.summary,
          description: op.description ?? '',
          input_type: op.inputType ?? null,
          output_type: op.outputType ?? null,
        })),
      ),
    );

    const apiPathOperationTagRows = projects.flatMap(p =>
      p.apiPaths.flatMap(ap =>
        ap.operations.flatMap(op =>
          (op.tags ?? []).map((tag, tag_order) => ({
            operation_id: op.id,
            tag_order,
            tag,
          })),
        ),
      ),
    );

    const apiPathOperationMiddlewareIdRows = projects.flatMap(p =>
      p.apiPaths.flatMap(ap =>
        ap.operations.flatMap(op =>
          (op.middlewareIds ?? []).map((middleware_id, middleware_order) => ({
            operation_id: op.id,
            middleware_order,
            middleware_id,
          })),
        ),
      ),
    );

    const pipelineStepRows = projects.flatMap(p =>
      p.pipelines.flatMap(pl =>
        pl.steps.map(step => ({
          id: step.id,
          pipeline_id: pl.id,
          step_order: step.order,
          type: step.type,
          name: step.name,
          description: step.description ?? '',
          bot_id: step.botId ?? null,
          code: step.code ?? null,
          config: step.config ?? {},
        })),
      ),
    );

    if (entityFieldRows.length > 0) {
      await supabase.from('entity_fields').insert(entityFieldRows);
    }
    if (entityFieldEnumRows.length > 0) {
      await supabase
        .from('entity_field_enum_values')
        .insert(entityFieldEnumRows);
    }
    if (entityMiddlewareBindingRows.length > 0) {
      await supabase
        .from('entity_middleware_bindings')
        .insert(entityMiddlewareBindingRows);
    }
    if (entityMiddlewareBindingMethodRows.length > 0) {
      await supabase
        .from('entity_middleware_binding_methods')
        .insert(entityMiddlewareBindingMethodRows);
    }
    if (serviceMethodRows.length > 0) {
      await supabase.from('service_methods').insert(serviceMethodRows);
    }
    if (serviceDependencyRows.length > 0) {
      await supabase.from('service_dependencies').insert(serviceDependencyRows);
    }
    if (pageComponentRows.length > 0) {
      await supabase.from('page_components').insert(pageComponentRows);
    }
    if (pageVisibleFieldRows.length > 0) {
      await supabase
        .from('page_component_visible_fields')
        .insert(pageVisibleFieldRows);
    }
    if (pageLinkedComponentRows.length > 0) {
      await supabase
        .from('page_component_linked_components')
        .insert(pageLinkedComponentRows);
    }
    if (apiPathOperationRows.length > 0) {
      await supabase.from('api_path_operations').insert(apiPathOperationRows);
    }
    if (apiPathOperationTagRows.length > 0) {
      await supabase
        .from('api_path_operation_tags')
        .insert(apiPathOperationTagRows);
    }
    if (apiPathOperationMiddlewareIdRows.length > 0) {
      await supabase
        .from('api_path_operation_middleware_ids')
        .insert(apiPathOperationMiddlewareIdRows);
    }
    if (pipelineStepRows.length > 0) {
      await supabase.from('pipeline_steps').insert(pipelineStepRows);
    }
  }

  // Update store meta
  const accountId = await getAccountIdForCurrentUser();
  const userId = getAuthUserIdForMeta();
  await supabase.from(META_TABLE).upsert(
    {
      key,
      user_id: userId,
      account_id: accountId,
      active_project_id: activeProjectId,
      project_ids: nextProjectIds,
    },
    { onConflict: 'key' },
  );
}

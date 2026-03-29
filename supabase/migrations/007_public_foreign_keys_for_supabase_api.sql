-- =============================================================================
-- Migration 007: Foreign keys so Supabase / PostgREST can link rows to projects
-- =============================================================================
-- PostgREST builds its "schema cache" relationships from PostgreSQL foreign keys.
-- Prerequisite: migrations 001–006 applied (base tables + ownership columns).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Clean orphaned references BEFORE adding FKs (avoids ERROR 23503)
-- ---------------------------------------------------------------------------
-- active_project_id may point at a deleted project; FK requires a valid row or NULL.
UPDATE public.store_state_meta
SET active_project_id = NULL
WHERE active_project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = store_state_meta.active_project_id
  );

-- project_ids[] may contain deleted project UUIDs — keep only ids that still exist.
UPDATE public.store_state_meta m
SET project_ids = COALESCE(
  (
    SELECT array_agg(x.pid)
    FROM unnest(COALESCE(m.project_ids, '{}'::uuid[])) AS x(pid)
    WHERE EXISTS (SELECT 1 FROM public.projects p WHERE p.id = x.pid)
  ),
  '{}'::uuid[]
);

-- ---------------------------------------------------------------------------
-- 1. entity_relations → entities
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_relations_source_entity_id_fkey'
  ) THEN
    ALTER TABLE public.entity_relations
      ADD CONSTRAINT entity_relations_source_entity_id_fkey
      FOREIGN KEY (source_entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_relations_target_entity_id_fkey'
  ) THEN
    ALTER TABLE public.entity_relations
      ADD CONSTRAINT entity_relations_target_entity_id_fkey
      FOREIGN KEY (target_entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. store_state_meta → projects (active project)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_state_meta_active_project_id_fkey'
  ) THEN
    ALTER TABLE public.store_state_meta
      ADD CONSTRAINT store_state_meta_active_project_id_fkey
      FOREIGN KEY (active_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. page_components → entities, entity_relations, page_components
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'page_components_entity_id_fkey'
  ) THEN
    ALTER TABLE public.page_components
      ADD CONSTRAINT page_components_entity_id_fkey
      FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'page_components_relation_id_fkey'
  ) THEN
    ALTER TABLE public.page_components
      ADD CONSTRAINT page_components_relation_id_fkey
      FOREIGN KEY (relation_id) REFERENCES public.entity_relations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'page_components_linked_submit_button_id_fkey'
  ) THEN
    ALTER TABLE public.page_components
      ADD CONSTRAINT page_components_linked_submit_button_id_fkey
      FOREIGN KEY (linked_submit_button_id) REFERENCES public.page_components(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. kv_store → projects (optional)
-- ---------------------------------------------------------------------------
ALTER TABLE public.kv_store
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kv_store_project_id ON public.kv_store(project_id);

UPDATE public.kv_store
SET project_id = NULL
WHERE project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = kv_store.project_id);

-- ---------------------------------------------------------------------------
-- 5. Junction: store_state_meta.project_ids ↔ projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_state_meta_projects (
  meta_key TEXT NOT NULL REFERENCES public.store_state_meta(key) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meta_key, project_id)
);

CREATE INDEX IF NOT EXISTS idx_store_state_meta_projects_project_id
  ON public.store_state_meta_projects(project_id);

COMMENT ON TABLE public.store_state_meta_projects IS
  'Junction linking store_state_meta keys to projects; mirrors project_ids[] for PostgREST FK graphs.';

CREATE OR REPLACE FUNCTION public.sync_store_state_meta_projects()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.store_state_meta_projects WHERE meta_key = NEW.key;
  INSERT INTO public.store_state_meta_projects (meta_key, project_id)
  SELECT NEW.key, x.project_id
  FROM unnest(COALESCE(NEW.project_ids, '{}'::uuid[])) AS x(project_id)
  WHERE EXISTS (SELECT 1 FROM public.projects p WHERE p.id = x.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_store_state_meta_projects ON public.store_state_meta;
CREATE TRIGGER trg_sync_store_state_meta_projects
  AFTER INSERT OR UPDATE OF project_ids, key ON public.store_state_meta
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_store_state_meta_projects();

INSERT INTO public.store_state_meta_projects (meta_key, project_id)
SELECT m.key, x.project_id
FROM public.store_state_meta m
CROSS JOIN LATERAL unnest(COALESCE(m.project_ids, '{}'::uuid[])) AS x(project_id)
WHERE EXISTS (SELECT 1 FROM public.projects p WHERE p.id = x.project_id)
ON CONFLICT (meta_key, project_id) DO NOTHING;

ALTER TABLE public.store_state_meta_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User owns meta project links" ON public.store_state_meta_projects;
CREATE POLICY "User owns meta project links" ON public.store_state_meta_projects
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

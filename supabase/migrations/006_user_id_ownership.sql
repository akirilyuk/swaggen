-- =============================================================================
-- Migration 006: accounts table + projects.user_id + RLS via auth.uid()
-- =============================================================================
-- Run after 001–005 (or at minimum after 002 + 003 + 004 if 005 was never applied).
-- This migration is safe to run when public.accounts did not exist: it creates it,
-- backfills from auth.users, adds projects.user_id, and rewrites RLS to use
-- user_id = auth.uid() so inserts work without PostgREST relationship embeds.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Accounts (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. Helper is_owner (used by accounts + optional legacy paths)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner(check_account_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = check_account_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 3. projects.user_id + FK to accounts (if missing from 005)
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_account_id ON public.projects(account_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- ---------------------------------------------------------------------------
-- 4. store_state_meta.user_id (RLS without depending on account embed)
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_state_meta
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.store_state_meta
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 5. Backfill accounts for existing Auth users (signup before this migration)
-- ---------------------------------------------------------------------------
INSERT INTO public.accounts (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'name', u.email, '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = u.id);

-- Link projects to auth user via legacy account_id, then sync ids
UPDATE public.projects p
SET user_id = a.user_id
FROM public.accounts a
WHERE p.account_id = a.id AND (p.user_id IS NULL OR p.user_id IS DISTINCT FROM a.user_id);

UPDATE public.projects p
SET account_id = a.id
FROM public.accounts a
WHERE p.user_id = a.user_id AND p.account_id IS NULL;

UPDATE public.projects p
SET user_id = a.user_id
FROM public.accounts a
WHERE p.user_id IS NULL AND p.account_id = a.id;

-- ---------------------------------------------------------------------------
-- 6. store_state_meta backfill
-- ---------------------------------------------------------------------------
UPDATE public.store_state_meta m
SET user_id = a.user_id
FROM public.accounts a
WHERE m.account_id = a.id AND m.user_id IS NULL;

UPDATE public.store_state_meta m
SET account_id = a.id
FROM public.accounts a
WHERE m.user_id = a.user_id AND m.account_id IS NULL;

-- ---------------------------------------------------------------------------
-- 7. RLS — accounts
-- ---------------------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.accounts;
DROP POLICY IF EXISTS "Users see own account" ON public.accounts;
CREATE POLICY "Users see own account" ON public.accounts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 8. RLS — projects (primary: user_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.projects;
DROP POLICY IF EXISTS "Account owns projects" ON public.projects;
DROP POLICY IF EXISTS "User owns projects" ON public.projects;
CREATE POLICY "User owns projects" ON public.projects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 9. RLS — store_state_meta
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_state_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.store_state_meta;
DROP POLICY IF EXISTS "Account owns meta" ON public.store_state_meta;
DROP POLICY IF EXISTS "User owns meta" ON public.store_state_meta;
CREATE POLICY "User owns meta" ON public.store_state_meta
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 10. Child tables — ownership via projects.user_id = auth.uid()
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'entities',
    'entity_relations',
    'middlewares',
    'services',
    'pages',
    'api_paths',
    'pipelines',
    'bots'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via project" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "User owns via project" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "User owns via project" ON %I
         FOR ALL
         USING  (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
         WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))',
      tbl
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'entity_fields',
    'entity_field_enum_values',
    'entity_middleware_bindings',
    'entity_middleware_binding_methods'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via entity" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "User owns via entity" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "User owns via entity" ON %I
         FOR ALL
         USING  (entity_id IN (
           SELECT e.id FROM public.entities e
           JOIN public.projects p ON e.project_id = p.id
           WHERE p.user_id = auth.uid()
         ))
         WITH CHECK (entity_id IN (
           SELECT e.id FROM public.entities e
           JOIN public.projects p ON e.project_id = p.id
           WHERE p.user_id = auth.uid()
         ))',
      tbl
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'service_methods',
    'service_dependencies'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via service" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "User owns via service" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "User owns via service" ON %I
         FOR ALL
         USING  (service_id IN (
           SELECT s.id FROM public.services s
           JOIN public.projects p ON s.project_id = p.id
           WHERE p.user_id = auth.uid()
         ))
         WITH CHECK (service_id IN (
           SELECT s.id FROM public.services s
           JOIN public.projects p ON s.project_id = p.id
           WHERE p.user_id = auth.uid()
         ))',
      tbl
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'page_components',
    'page_component_visible_fields',
    'page_component_linked_components'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via page" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "User owns via page" ON %I', tbl);
    IF tbl = 'page_components' THEN
      EXECUTE format(
        'CREATE POLICY "User owns via page" ON %I
           FOR ALL
           USING  (page_id IN (
             SELECT pg.id FROM public.pages pg
             JOIN public.projects p ON pg.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))
           WITH CHECK (page_id IN (
             SELECT pg.id FROM public.pages pg
             JOIN public.projects p ON pg.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))',
        tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "User owns via page" ON %I
           FOR ALL
           USING  (page_component_id IN (
             SELECT pc.id FROM public.page_components pc
             JOIN public.pages pg ON pc.page_id = pg.id
             JOIN public.projects p ON pg.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))
           WITH CHECK (page_component_id IN (
             SELECT pc.id FROM public.page_components pc
             JOIN public.pages pg ON pc.page_id = pg.id
             JOIN public.projects p ON pg.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'api_path_operations',
    'api_path_operation_middleware_ids',
    'api_path_operation_tags'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via api_path" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "User owns via api_path" ON %I', tbl);
    IF tbl = 'api_path_operations' THEN
      EXECUTE format(
        'CREATE POLICY "User owns via api_path" ON %I
           FOR ALL
           USING  (api_path_id IN (
             SELECT ap.id FROM public.api_paths ap
             JOIN public.projects p ON ap.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))
           WITH CHECK (api_path_id IN (
             SELECT ap.id FROM public.api_paths ap
             JOIN public.projects p ON ap.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))',
        tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "User owns via api_path" ON %I
           FOR ALL
           USING  (operation_id IN (
             SELECT apo.id FROM public.api_path_operations apo
             JOIN public.api_paths ap ON apo.api_path_id = ap.id
             JOIN public.projects p ON ap.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))
           WITH CHECK (operation_id IN (
             SELECT apo.id FROM public.api_path_operations apo
             JOIN public.api_paths ap ON apo.api_path_id = ap.id
             JOIN public.projects p ON ap.project_id = p.id
             WHERE p.user_id = auth.uid()
           ))',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Allow all" ON public.pipeline_steps;
DROP POLICY IF EXISTS "Account owns via pipeline" ON public.pipeline_steps;
DROP POLICY IF EXISTS "User owns via pipeline" ON public.pipeline_steps;
CREATE POLICY "User owns via pipeline" ON public.pipeline_steps
  FOR ALL
  USING (pipeline_id IN (
    SELECT pl.id FROM public.pipelines pl
    JOIN public.projects p ON pl.project_id = p.id
    WHERE p.user_id = auth.uid()
  ))
  WITH CHECK (pipeline_id IN (
    SELECT pl.id FROM public.pipelines pl
    JOIN public.projects p ON pl.project_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- =============================================================================
-- Migration 005: Accounts, project ownership, and proper RLS
-- =============================================================================
-- Introduces a Supabase Auth–backed account model.
-- Every project (and its store_state_meta row) is owned by an account.
-- Row Level Security ensures users can only see their own data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Accounts table (maps 1-to-1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create an account row when a new user signs up
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

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. Add account_id FK to projects
-- ---------------------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects(account_id);

-- ---------------------------------------------------------------------------
-- 3. Add account_id FK to store_state_meta
-- ---------------------------------------------------------------------------
ALTER TABLE store_state_meta
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. Helper: check if the current user owns a given account_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner(check_account_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounts WHERE id = check_account_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 5. Replace "Allow all" RLS policies with ownership-based policies
-- ---------------------------------------------------------------------------

-- ── accounts ────────────────────────────────────────────────────────────────
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON accounts;
DROP POLICY IF EXISTS "Users see own account" ON accounts;
CREATE POLICY "Users see own account" ON accounts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── projects ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all" ON projects;
DROP POLICY IF EXISTS "Account owns projects" ON projects;
CREATE POLICY "Account owns projects" ON projects
  FOR ALL USING (is_owner(account_id)) WITH CHECK (is_owner(account_id));

-- ── store_state_meta ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all" ON store_state_meta;
DROP POLICY IF EXISTS "Account owns meta" ON store_state_meta;
ALTER TABLE store_state_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account owns meta" ON store_state_meta
  FOR ALL USING (is_owner(account_id)) WITH CHECK (is_owner(account_id));

-- ── Top-level child tables (use project_id → projects.account_id) ───────────
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
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via project" ON %s', tbl);
    EXECUTE format(
      'CREATE POLICY "Account owns via project" ON %s
         FOR ALL
         USING  (project_id IN (SELECT id FROM projects WHERE is_owner(account_id)))
         WITH CHECK (project_id IN (SELECT id FROM projects WHERE is_owner(account_id)))',
      tbl
    );
  END LOOP;
END;
$$;

-- ── Nested child tables (no direct project_id — inherit from parent) ────────
-- These tables reference their parent via FK with ON DELETE CASCADE, and the
-- parent already has RLS. Supabase evaluates RLS on each table independently,
-- so we need policies here too.

-- Entity child tables (entity_id → entities.project_id → projects.account_id)
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
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via entity" ON %s', tbl);
    EXECUTE format(
      'CREATE POLICY "Account owns via entity" ON %s
         FOR ALL
         USING  (entity_id IN (
           SELECT e.id FROM entities e
           JOIN projects p ON e.project_id = p.id
           WHERE is_owner(p.account_id)
         ))
         WITH CHECK (entity_id IN (
           SELECT e.id FROM entities e
           JOIN projects p ON e.project_id = p.id
           WHERE is_owner(p.account_id)
         ))',
      tbl
    );
  END LOOP;
END;
$$;

-- Service child tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'service_methods',
    'service_dependencies'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via service" ON %s', tbl);
    EXECUTE format(
      'CREATE POLICY "Account owns via service" ON %s
         FOR ALL
         USING  (service_id IN (
           SELECT s.id FROM services s
           JOIN projects p ON s.project_id = p.id
           WHERE is_owner(p.account_id)
         ))
         WITH CHECK (service_id IN (
           SELECT s.id FROM services s
           JOIN projects p ON s.project_id = p.id
           WHERE is_owner(p.account_id)
         ))',
      tbl
    );
  END LOOP;
END;
$$;

-- Page child tables
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
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via page" ON %s', tbl);
    -- page_components has page_id → pages
    -- visible_fields / linked_components have page_component_id → page_components
    IF tbl = 'page_components' THEN
      EXECUTE format(
        'CREATE POLICY "Account owns via page" ON %s
           FOR ALL
           USING  (page_id IN (
             SELECT pg.id FROM pages pg
             JOIN projects p ON pg.project_id = p.id
             WHERE is_owner(p.account_id)
           ))
           WITH CHECK (page_id IN (
             SELECT pg.id FROM pages pg
             JOIN projects p ON pg.project_id = p.id
             WHERE is_owner(p.account_id)
           ))',
        tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "Account owns via page" ON %s
           FOR ALL
           USING  (page_component_id IN (
             SELECT pc.id FROM page_components pc
             JOIN pages pg ON pc.page_id = pg.id
             JOIN projects p ON pg.project_id = p.id
             WHERE is_owner(p.account_id)
           ))
           WITH CHECK (page_component_id IN (
             SELECT pc.id FROM page_components pc
             JOIN pages pg ON pc.page_id = pg.id
             JOIN projects p ON pg.project_id = p.id
             WHERE is_owner(p.account_id)
           ))',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- API path child tables
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
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Account owns via api_path" ON %s', tbl);
    IF tbl = 'api_path_operations' THEN
      EXECUTE format(
        'CREATE POLICY "Account owns via api_path" ON %s
           FOR ALL
           USING  (api_path_id IN (
             SELECT ap.id FROM api_paths ap
             JOIN projects p ON ap.project_id = p.id
             WHERE is_owner(p.account_id)
           ))
           WITH CHECK (api_path_id IN (
             SELECT ap.id FROM api_paths ap
             JOIN projects p ON ap.project_id = p.id
             WHERE is_owner(p.account_id)
           ))',
        tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "Account owns via api_path" ON %s
           FOR ALL
           USING  (operation_id IN (
             SELECT apo.id FROM api_path_operations apo
             JOIN api_paths ap ON apo.api_path_id = ap.id
             JOIN projects p ON ap.project_id = p.id
             WHERE is_owner(p.account_id)
           ))
           WITH CHECK (operation_id IN (
             SELECT apo.id FROM api_path_operations apo
             JOIN api_paths ap ON apo.api_path_id = ap.id
             JOIN projects p ON ap.project_id = p.id
             WHERE is_owner(p.account_id)
           ))',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- Pipeline child table
DROP POLICY IF EXISTS "Allow all" ON pipeline_steps;
DROP POLICY IF EXISTS "Account owns via pipeline" ON pipeline_steps;
CREATE POLICY "Account owns via pipeline" ON pipeline_steps
  FOR ALL
  USING (pipeline_id IN (
    SELECT pl.id FROM pipelines pl
    JOIN projects p ON pl.project_id = p.id
    WHERE is_owner(p.account_id)
  ))
  WITH CHECK (pipeline_id IN (
    SELECT pl.id FROM pipelines pl
    JOIN projects p ON pl.project_id = p.id
    WHERE is_owner(p.account_id)
  ));


-- =============================================================================
-- Zustand store metadata
-- =============================================================================
-- This table is used by `src/lib/supabaseStorage.ts` to track:
-- - which project ids belong to this Zustand store (`project_ids`)
-- - which project is currently active (`active_project_id`)
--
-- The actual project data is stored in normalized tables (projects, entities, ...).
CREATE TABLE IF NOT EXISTS store_state_meta (
  key TEXT PRIMARY KEY,
  active_project_id UUID NULL,
  project_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_store_state_meta_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_store_state_meta_updated_at ON store_state_meta;
CREATE TRIGGER update_store_state_meta_updated_at
  BEFORE UPDATE ON store_state_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_store_state_meta_updated_at_column();

-- RLS - allow all for now (matches existing project schema)
ALTER TABLE store_state_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON store_state_meta;
CREATE POLICY "Allow all" ON store_state_meta
  FOR ALL
  USING (true)
  WITH CHECK (true);


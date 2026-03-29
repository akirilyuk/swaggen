-- =============================================================================
-- Fully normalize nested arrays previously stored as JSONB columns
-- (fields, middlewareBindings+methods, services methods/dependencies,
--  pages components, api path operations, pipeline steps)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Entities -> entity_fields (+ enum values)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_fields (
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  field_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'date', 'enum', 'json', 'uuid')),
  required BOOLEAN NOT NULL DEFAULT false,
  description TEXT DEFAULT '',
  default_value TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, field_order)
);

CREATE INDEX IF NOT EXISTS idx_entity_fields_entity_id ON entity_fields(entity_id);

CREATE TABLE IF NOT EXISTS entity_field_enum_values (
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  field_order INTEGER NOT NULL,
  enum_order INTEGER NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, field_order, enum_order),
  FOREIGN KEY (entity_id, field_order) REFERENCES entity_fields(entity_id, field_order) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_field_enum_values_entity_id ON entity_field_enum_values(entity_id);

-- -----------------------------------------------------------------------------
-- Entities -> entity_middleware_bindings (+ methods)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_middleware_bindings (
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  binding_order INTEGER NOT NULL,
  middleware_id UUID NOT NULL REFERENCES middlewares(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, binding_order)
);

CREATE INDEX IF NOT EXISTS idx_entity_middleware_bindings_entity_id ON entity_middleware_bindings(entity_id);

CREATE TABLE IF NOT EXISTS entity_middleware_binding_methods (
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  binding_order INTEGER NOT NULL,
  method_order INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, binding_order, method_order),
  FOREIGN KEY (entity_id, binding_order) REFERENCES entity_middleware_bindings(entity_id, binding_order) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_middleware_binding_methods_entity_id ON entity_middleware_binding_methods(entity_id);

-- -----------------------------------------------------------------------------
-- Services -> service_methods + service_dependencies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_methods (
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  method_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  -- Deprecated field in domain; kept for compatibility
  entity_id TEXT DEFAULT NULL,
  input_type TEXT DEFAULT NULL,
  output_type TEXT DEFAULT NULL,
  code TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, method_order)
);

CREATE INDEX IF NOT EXISTS idx_service_methods_service_id ON service_methods(service_id);

CREATE TABLE IF NOT EXISTS service_dependencies (
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  dependency_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, dependency_order)
);

CREATE INDEX IF NOT EXISTS idx_service_dependencies_service_id ON service_dependencies(service_id);

-- -----------------------------------------------------------------------------
-- Pages -> page_components + visible fields + linked components
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_components (
  id UUID PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  title TEXT NOT NULL,
  entity_id UUID NULL,
  relation_id UUID NULL,
  slot TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  size_width INTEGER NOT NULL DEFAULT 0,
  size_height INTEGER NOT NULL DEFAULT 0,
  linked_submit_button_id UUID NULL,
  submit_action JSONB NULL,
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_components_page_id ON page_components(page_id);
CREATE INDEX IF NOT EXISTS idx_page_components_order ON page_components(page_id, "order");

CREATE TABLE IF NOT EXISTS page_component_visible_fields (
  page_component_id UUID NOT NULL REFERENCES page_components(id) ON DELETE CASCADE,
  visible_field_order INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (page_component_id, visible_field_order)
);

CREATE INDEX IF NOT EXISTS idx_page_component_visible_fields_component_id
  ON page_component_visible_fields(page_component_id);

CREATE TABLE IF NOT EXISTS page_component_linked_components (
  page_component_id UUID NOT NULL REFERENCES page_components(id) ON DELETE CASCADE,
  linked_component_order INTEGER NOT NULL,
  linked_component_id UUID NOT NULL REFERENCES page_components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (page_component_id, linked_component_order)
);

CREATE INDEX IF NOT EXISTS idx_page_component_linked_components_component_id
  ON page_component_linked_components(page_component_id);

-- -----------------------------------------------------------------------------
-- API Paths -> api_path_operations + middleware ids + tags
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_path_operations (
  id UUID PRIMARY KEY,
  api_path_id UUID NOT NULL REFERENCES api_paths(id) ON DELETE CASCADE,
  operation_order INTEGER NOT NULL,
  method TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT DEFAULT '',
  input_type TEXT DEFAULT NULL,
  output_type TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_path_operations_api_path_id ON api_path_operations(api_path_id);
CREATE INDEX IF NOT EXISTS idx_api_path_operations_order ON api_path_operations(api_path_id, operation_order);

CREATE TABLE IF NOT EXISTS api_path_operation_middleware_ids (
  operation_id UUID NOT NULL REFERENCES api_path_operations(id) ON DELETE CASCADE,
  middleware_order INTEGER NOT NULL,
  middleware_id UUID NOT NULL REFERENCES middlewares(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (operation_id, middleware_order)
);

CREATE INDEX IF NOT EXISTS idx_api_path_operation_middleware_ids_operation_id
  ON api_path_operation_middleware_ids(operation_id);

CREATE TABLE IF NOT EXISTS api_path_operation_tags (
  operation_id UUID NOT NULL REFERENCES api_path_operations(id) ON DELETE CASCADE,
  tag_order INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (operation_id, tag_order)
);

CREATE INDEX IF NOT EXISTS idx_api_path_operation_tags_operation_id ON api_path_operation_tags(operation_id);

-- -----------------------------------------------------------------------------
-- Pipelines -> pipeline_steps
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_steps (
  id UUID PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  bot_id UUID NULL REFERENCES bots(id) ON DELETE SET NULL,
  code TEXT DEFAULT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_steps_type_check CHECK (type IN ('bot', 'transform', 'script', 'filter'))
);

CREATE INDEX IF NOT EXISTS idx_pipeline_steps_pipeline_id ON pipeline_steps(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_order ON pipeline_steps(pipeline_id, step_order);

-- -----------------------------------------------------------------------------
-- Updated_at triggers + RLS (Allow all for now)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'entity_fields',
    'entity_field_enum_values',
    'entity_middleware_bindings',
    'entity_middleware_binding_methods',
    'service_methods',
    'service_dependencies',
    'page_components',
    'page_component_visible_fields',
    'page_component_linked_components',
    'api_path_operations',
    'api_path_operation_middleware_ids',
    'api_path_operation_tags',
    'pipeline_steps'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', tbl, tbl);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
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
    'entity_middleware_binding_methods',
    'service_methods',
    'service_dependencies',
    'page_components',
    'page_component_visible_fields',
    'page_component_linked_components',
    'api_path_operations',
    'api_path_operation_middleware_ids',
    'api_path_operation_tags',
    'pipeline_steps'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %s', tbl);
    EXECUTE format('CREATE POLICY "Allow all" ON %s FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END;
$$;


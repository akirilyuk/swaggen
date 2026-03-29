/**
 * Core domain types for SwaggenNext projects.
 *
 * A project is owned by a Supabase Auth user (`Project.userId`). In storage this is
 * represented as `accountId` (FK to `accounts`, which maps 1:1 to `auth.users`).
 * All data that hangs off a project (entities, relations, middlewares, services,
 * pages, API paths, pipelines, bots) is owned transitively via `project_id`; RLS
 * enforces access through the project’s account.
 */

import type { SwaggenDocument } from '@/types/swaggenCanvas';

/* ------------------------------------------------------------------ */
/*  Entities & Relations                                               */
/* ------------------------------------------------------------------ */

export interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json' | 'uuid';
  required: boolean;
  description?: string;
  enumValues?: string[];
  defaultValue?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export const ALL_HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

/** Maps a route-scoped middleware to the HTTP methods it should run on. */
export interface EntityMiddlewareBinding {
  middlewareId: string;
  /** Which HTTP methods this middleware runs on. Empty = none. */
  methods: HttpMethod[];
}

/** Belongs to a project; effective owner is `Project.userId` for that project. */
export interface Entity {
  id: string;
  name: string;
  description?: string;
  fields: EntityField[];
  /** Route-scoped middleware assignments with per-method granularity */
  middlewareBindings: EntityMiddlewareBinding[];
}

export type RelationType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many';

export interface EntityRelation {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: RelationType;
  fieldName: string;
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  Middlewares                                                         */
/* ------------------------------------------------------------------ */

export type MiddlewareScope = 'global' | 'route';

export interface MiddlewareConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  /** Runs on every request ('global') or only on assigned entity routes ('route') */
  scope: MiddlewareScope;
  /** Whether this middleware was added from the built-in presets */
  isPreset: boolean;
  /** User-written middleware body (TypeScript) */
  code: string;
}

/* ------------------------------------------------------------------ */
/*  Services                                                           */
/* ------------------------------------------------------------------ */

export interface ServiceMethod {
  name: string;
  description: string;
  /** @deprecated Use inputType / outputType instead */
  entityId?: string;
  /** The input parameter type (e.g. "User", "string", "{ name: string }") */
  inputType?: string;
  /** The return type (e.g. "User", "User[]", "void") */
  outputType?: string;
  /** Custom implementation code for this method */
  code?: string;
}

export interface ServiceHealthCheck {
  /** Whether this service exposes a health check */
  enabled: boolean;
  /** Custom health check path (default: /health/{serviceName}) */
  path: string;
  /** User-written health check code */
  code: string;
}

/** An external package dependency that a service requires */
export interface ServiceDependency {
  /** Package name (e.g. "axios", "@prisma/client") */
  name: string;
  /** Semver version (e.g. "^2.0.0"). Empty = latest */
  version: string;
}

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  methods: ServiceMethod[];
  /** Optional health check configuration */
  healthCheck?: ServiceHealthCheck;
  /** Full service code — imports, class/functions, exports */
  code: string;
  /** External npm dependencies required by this service */
  dependencies: ServiceDependency[];
}

/* ------------------------------------------------------------------ */
/*  Data Storage                                                       */
/* ------------------------------------------------------------------ */

export type DataStorageProvider =
  | 'supabase'
  | 'mongodb'
  | 'mysql'
  | 'postgres'
  | 'redis'
  | 'sqlite';

export interface DataStorageConfig {
  provider: DataStorageProvider;
  connectionString: string;
  enabled: boolean;
}

/* ------------------------------------------------------------------ */
/*  Frontend Page Designer                                             */
/* ------------------------------------------------------------------ */

/**
 * The visual component templates the user can drop onto a page.
 * Each template maps to a generated React component.
 */
export type UIComponentTemplate =
  // Data components
  | 'list-table' // Data table listing all rows of an entity
  | 'detail-card' // Read-only detail view for a single record
  | 'entity-form' // Entity field form (create or edit flows)
  | 'relation' // Related records: list or dropdown (see props.displayMode)
  | 'stat-card' // Summary statistic (count, sum, etc.)
  // Form inputs
  | 'text-input' // Form text input
  | 'number-input' // Form number input
  | 'checkbox' // Form checkbox
  | 'date-picker' // Form date picker
  | 'text-area' // Form multiline text
  | 'select-dropdown' // Form dropdown
  // Basic HTML elements
  | 'header-text' // Heading (h1-h6)
  | 'paragraph' // Paragraph text
  | 'link' // Anchor link
  | 'image' // Image
  | 'divider' // Horizontal rule
  | 'spacer' // Empty space
  | 'container' // Div container/wrapper
  | 'button' // Generic button (supports HTTP actions, code execution, or plain click)
  | 'response-view' // Display response from an action
  | 'badge' // Badge/tag
  | 'alert' // Alert/notification box
  | 'card' // Card container
  | 'list' // Unordered/ordered list
  | 'blockquote' // Quote block
  | 'code-block' // Code snippet
  | 'icon' // Icon element
  | 'video' // Video embed
  | 'iframe' // Iframe embed
  | 'custom'; // Free-form custom component

/** Layout slot inside a page grid (1-6 columns span) */
export type UILayoutSlot =
  | '1-col'
  | '2-col'
  | '3-col'
  | '4-col'
  | '5-col'
  | '6-col'
  | 'full'
  | 'half-left'
  | 'half-right'
  | 'third-1'
  | 'third-2'
  | 'third-3';

/** A single component placed on a UI page */
export interface UIComponent {
  id: string;
  template: UIComponentTemplate;
  /** Display title shown in the header of the component */
  title: string;
  /** The entity this component renders data for */
  entityId: string | null;
  /**
   * When `template` is `relation`, this points to the relation that supplies
   * the linked data.
   */
  relationId: string | null;
  /** Grid layout slot (legacy) */
  slot: UILayoutSlot;
  /** Render order within the page (0-based) */
  order: number;
  /** Position and size for free-form layout */
  position: { x: number; y: number };
  size: { width: number; height: number };
  /** Which entity fields to show (empty = all) */
  visibleFields: string[];
  /**
   * IDs of input components whose values are collected by this button.
   * Used for `button` with an HTTP action.
   */
  linkedComponentIds?: string[];
  /**
   * ID of the button this response view is linked to.
   * Only used when `template === 'response-view'`.
   */
  linkedSubmitButtonId?: string;
  /**
   * HTTP action when the user clicks this button (actionType 'http').
   * Applies to `button`.
   */
  submitAction?: SubmitAction;
  /** Custom props / overrides (freeform JSON) */
  props: Record<string, unknown>;
}

/** Shared fields for every HTTP submit action */
interface SubmitActionBase {
  /** HTTP method to use */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** URL or path to call, e.g. "/api/users" or "https://example.com/endpoint" */
  url: string;
  /** How to encode the body payload */
  payloadFormat: 'json' | 'form-data';
  /** ID of the 'response-view' component to display the result in */
  responseViewId?: string;
}

/** Payload assembled from linked input components (default) */
interface SubmitActionLinked extends SubmitActionBase {
  payloadMode?: 'linked';
}

/** Payload assembled from selected entity fields */
interface SubmitActionEntities extends SubmitActionBase {
  payloadMode: 'entities';
  /** IDs of entities whose fields are included in the payload */
  payloadEntityIds: string[];
}

/** Payload is a hand-written JSON string */
interface SubmitActionCustom extends SubmitActionBase {
  payloadMode: 'custom';
  /** Raw JSON string for the payload */
  customPayload: string;
}

/** Payload merges linked inputs + entity data + custom JSON overrides */
interface SubmitActionMerged extends SubmitActionBase {
  payloadMode: 'merged';
  /** IDs of entities whose fields are included in the payload */
  payloadEntityIds?: string[];
  /** Raw JSON string merged on top */
  customPayload?: string;
}

/** HTTP action wired to a submit button — discriminated union on `payloadMode` */
export type SubmitAction =
  | SubmitActionLinked
  | SubmitActionEntities
  | SubmitActionCustom
  | SubmitActionMerged;

/** How the page is edited: free-form API components vs Swaggen visual canvas */
export type PageEditorMode = 'freeform' | 'swaggen';

/** A designed frontend page */
export interface UIPage {
  id: string;
  /** URL path, e.g. "/users" or "/posts/[id]" */
  path: string;
  /** Human-readable name */
  name: string;
  description?: string;
  /** Components placed on this page (freeform designer) */
  components: UIComponent[];
  /**
   * `swaggen` = visual canvas page; `freeform` or omitted = legacy component canvas.
   */
  editorMode?: PageEditorMode;
  /**
   * Canvas document when `editorMode === 'swaggen'`.
   * Persisted with the project and used for public `/site/...` rendering.
   */
  swaggenDocument?: SwaggenDocument;
  /**
   * Designer / preview field values (entity id → field name → string).
   * Saved with the page so preview and published site show the same sample data.
   */
  previewEntityValues?: Record<string, Record<string, string>>;
}

/* ------------------------------------------------------------------ */
/*  API Paths                                                          */
/* ------------------------------------------------------------------ */

/** A single HTTP operation on an API path */
export interface ApiPathOperation {
  id: string;
  method: HttpMethod;
  summary: string;
  description?: string;
  /** Type string for the request body (entity name, inline type, or undefined) */
  inputType?: string;
  /** Type string for the successful response (entity name, inline type, or undefined) */
  outputType?: string;
  /** Middleware IDs applied to this operation */
  middlewareIds: string[];
  /** Tags for grouping in the spec */
  tags: string[];
}

/** A manually defined API path with one or more HTTP operations */
export interface ApiPath {
  id: string;
  /** URL path, e.g. "/users" or "/users/{id}" */
  path: string;
  description?: string;
  operations: ApiPathOperation[];
}

/* ------------------------------------------------------------------ */
/*  Pipelines & Bots                                                   */
/* ------------------------------------------------------------------ */

export type PipelineStepType =
  | 'bot'
  | 'transform'
  | 'script'
  | 'filter'
  | 'middleware';

export interface PipelineStep {
  id: string;
  type: PipelineStepType;
  name: string;
  description?: string;
  /** Bot ID if type is 'bot' */
  botId?: string;
  /** Custom script/code for the step */
  code?: string;
  /** Configuration for the step (JSON) */
  config: Record<string, unknown>;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
}

export interface Bot {
  id: string;
  name: string;
  description?: string;
  /** Bot type or model */
  type: string;
  /** Custom prompt or instructions */
  instructions?: string;
  /** Configuration for the bot (JSON) */
  config: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Git Repository                                                     */
/* ------------------------------------------------------------------ */

export interface GitRepoConfig {
  /** Remote repository URL (HTTPS or SSH) */
  url: string;
  /** Branch to target (e.g. "main", "develop") */
  branch: string;
  /** Personal access token for authentication */
  token: string;
  /** Whether auto-commit on generate is enabled */
  autoCommit: boolean;
}

/* ------------------------------------------------------------------ */
/*  Account                                                            */
/* ------------------------------------------------------------------ */

/** A user account. Maps 1-to-1 with a Supabase Auth user. */
export interface Account {
  id: string;
  userId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Project (top-level aggregate)                                      */
/* ------------------------------------------------------------------ */

export interface Project {
  id: string;
  /**
   * Supabase Auth user id for the owner. Same as `accounts.user_id` when
   * `accountId` is set. Null when unauthenticated or not yet linked.
   */
  userId: string | null;
  /** Public.accounts row for this user — used for FK + RLS on `projects`. */
  accountId: string | null;
  name: string;
  description: string;
  /** Raw OpenAPI spec JSON string */
  openApiSpec: string;
  entities: Entity[];
  relations: EntityRelation[];
  middlewares: MiddlewareConfig[];
  services: ServiceConfig[];
  dataStorage: DataStorageConfig;
  /** Connected Git repository configuration */
  gitRepo: GitRepoConfig;
  /** Designed frontend pages */
  pages: UIPage[];
  /** Data processing pipelines */
  pipelines: Pipeline[];
  /** Manually defined API paths */
  apiPaths: ApiPath[];
  /** Bots available for pipelines */
  bots: Bot[];
  createdAt: string;
  updatedAt: string;
}

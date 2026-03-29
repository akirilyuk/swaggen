import { v4 as uuidV4 } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { fetchAccountIdForUser } from '@/lib/accountLookup';
import { supabaseStorage } from '@/lib/supabaseStorage';
import { supabaseDb } from '@/lib/supabaseDb';
import { useAuthStore } from '@/store/authStore';
import type {
  ApiPath,
  DataStorageConfig,
  Entity,
  EntityMiddlewareBinding,
  EntityRelation,
  GitRepoConfig,
  MiddlewareConfig,
  Pipeline,
  Bot,
  Project,
  ServiceConfig,
  UIPage,
} from '@/types/project';
import { ALL_HTTP_METHODS } from '@/types/project';
import { MIDDLEWARE_PRESETS } from '@/lib/middlewarePresets';
import { migrateUIPage } from '@/lib/migrateUiTemplates';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_SPEC = JSON.stringify(
  {
    openapi: '3.0.0',
    info: { title: 'My API', version: '1.0.0', description: '' },
    paths: {},
    components: { schemas: {} },
  },
  null,
  2,
);

const DEFAULT_STORAGE: DataStorageConfig = {
  provider: 'supabase',
  connectionString: '',
  enabled: false,
};

const DEFAULT_GIT_REPO: GitRepoConfig = {
  url: '',
  branch: 'main',
  token: '',
  autoCommit: false,
};

function normalizeServiceBaseImport(code: string): string {
  const normalized = code
    .replace(
      /from\s+['"]\.\.\/lib\/baseService['"]/g,
      "from '../lib/baseService'",
    )
    .replace(
      /from\s+['"]\.\/lib\/baseService['"]/g,
      "from '../lib/baseService'",
    )
    .replace(
      /from\s+['"]@\/lib\/baseService['"]/g,
      "from '../lib/baseService'",
    );

  const shouldManageBaseImport =
    /BaseService|HealthCheckResult|ServiceError|baseService/.test(normalized);
  if (!shouldManageBaseImport) return normalized;

  const withoutBaseImports = normalized.replace(
    /import\s+(type\s+)?\{[\s\S]*?\}\s+from\s+['"]\.\.\/lib\/baseService['"];?\s*/g,
    '',
  );
  const filtered = withoutBaseImports.split('\n');
  const canonicalImport =
    "import { BaseService, type HealthCheckResult } from '../lib/baseService';";
  const insertAt = filtered.findIndex(line => !line.trim().startsWith('import '));

  if (insertAt === -1) filtered.push(canonicalImport);
  else filtered.splice(insertAt, 0, canonicalImport);

  return filtered.join('\n');
}

function normalizeApiPathForProject(path: string, projectName: string): string {
  let value = (path ?? '').trim();
  if (!value) return '';
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  value = value.split('?')[0].split('#')[0];
  if (!value.startsWith('/')) value = `/${value}`;

  const prefixed = `/api/${slug}`;
  if (value === prefixed) value = '/';
  else if (value.startsWith(`${prefixed}/`)) value = value.slice(prefixed.length);
  else if (value === '/api') value = '/';
  else if (value.startsWith('/api/')) value = value.slice('/api'.length);

  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
  return value || '/';
}

const createProject = (name: string, description = ''): Project => {
  const errorHandlerPreset = MIDDLEWARE_PRESETS.find(
    p => p.name === 'errorHandler',
  );
  const defaultMiddlewares: MiddlewareConfig[] = errorHandlerPreset
    ? [
        {
          id: uuidV4(),
          name: errorHandlerPreset.name,
          description: errorHandlerPreset.description,
          enabled: true,
          order: 0,
          scope: errorHandlerPreset.scope,
          isPreset: true,
          code: errorHandlerPreset.code,
        },
      ]
    : [];

  return {
    id: uuidV4(),
    userId: null,
    accountId: null,
    name,
    description,
    openApiSpec: DEFAULT_SPEC,
    entities: [],
    relations: [],
    middlewares: defaultMiddlewares,
    services: [],
    dataStorage: { ...DEFAULT_STORAGE },
    gitRepo: { ...DEFAULT_GIT_REPO },
    pages: [],
    pipelines: [],
    bots: [],
    apiPaths: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/* ------------------------------------------------------------------ */
/*  Data migration (handles old localStorage shapes)                   */
/* ------------------------------------------------------------------ */

/**
 * Normalizes a project loaded from localStorage so it matches the
 * current type definitions. Handles:
 * - Middleware configs missing `scope` / `isPreset`
 * - Entities with old `middlewareIds: string[]` → `middlewareBindings`
 */
function migrateProject(raw: Record<string, unknown>): Project {
  const p = raw as unknown as Project & {
    entities: (Entity & { middlewareIds?: string[] })[];
  };

  // Migrate middleware configs
  const middlewares: MiddlewareConfig[] = (p.middlewares ?? []).map(mw => ({
    ...mw,
    scope: mw.scope ?? 'route',
    isPreset: mw.isPreset ?? false,
  }));

  // Migrate entities
  const entities: Entity[] = (p.entities ?? []).map(e => {
    // Already migrated?
    if (Array.isArray(e.middlewareBindings)) return e;

    // Convert old flat middlewareIds to bindings with all methods
    const oldIds: string[] =
      (e as { middlewareIds?: string[] }).middlewareIds ?? [];
    const middlewareBindings: EntityMiddlewareBinding[] = oldIds.map(id => ({
      middlewareId: id,
      methods: [...ALL_HTTP_METHODS],
    }));

    return {
      id: e.id,
      name: e.name,
      description: e.description,
      fields: e.fields,
      middlewareBindings,
    };
  });

  // Migrate pages — UI template ids, canvas widgets, layout defaults
  const pages: UIPage[] = (p.pages ?? []).map(page => {
    const migrated = migrateUIPage(page as UIPage);
    return {
      ...migrated,
      editorMode: migrated.editorMode ?? 'freeform',
      components: migrated.components.map((comp, idx) => ({
        ...comp,
        position: comp.position ?? { x: 20, y: 20 + idx * 150 },
        size: comp.size ?? { width: 300, height: 120 },
        slot: comp.slot ?? '6-col',
      })),
    };
  });

  // Migrate service configs — merge legacy `imports` field into `code`
  const services: ServiceConfig[] = (p.services ?? []).map(svc => {
    const legacy = svc as ServiceConfig & { imports?: string };
    const mergedCode =
      legacy.imports && legacy.code
        ? `${legacy.imports}\n\n${legacy.code}`
        : (legacy.imports ?? '') + (svc.code ?? '');
    const code = normalizeServiceBaseImport(mergedCode);
    return {
      ...svc,
      code,
      dependencies: svc.dependencies ?? [],
    };
  });

  return {
    ...p,
    userId: p.userId ?? null,
    accountId: p.accountId ?? null,
    middlewares,
    entities,
    services,
    pages,
    pipelines: p.pipelines ?? [],
    bots: p.bots ?? [],
    apiPaths: (p.apiPaths ?? []).map(ap => ({
      ...ap,
      path: normalizeApiPathForProject(ap.path, p.name ?? ''),
    })),
    gitRepo: p.gitRepo ?? { ...DEFAULT_GIT_REPO },
  };
}

/** Cached migration to avoid creating new object references on every read. */
let _migrateCache: { key: string; result: Project } | null = null;

function migrateProjectCached(raw: Record<string, unknown>): Project {
  const p = raw as unknown as Project;
  const key = `${p.id}::${p.updatedAt}`;
  if (_migrateCache?.key === key) return _migrateCache.result;
  const result = migrateProject(raw);
  _migrateCache = { key, result };
  return result;
}

/* ------------------------------------------------------------------ */
/*  Store interface                                                    */
/* ------------------------------------------------------------------ */

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;

  /* Selectors */
  activeProject: () => Project | undefined;

  /* Project CRUD */
  addProject: (name: string, description?: string) => Promise<string>;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;

  /* Spec */
  updateSpec: (spec: string) => void;

  /* Entities */
  addEntity: (entity: Entity) => void;
  updateEntity: (entity: Entity) => void;
  deleteEntity: (id: string) => void;
  deleteAllEntities: () => void;

  /* Relations */
  addRelation: (relation: EntityRelation) => void;
  updateRelation: (relation: EntityRelation) => void;
  deleteRelation: (id: string) => void;

  /* Middlewares */
  addMiddleware: (mw: MiddlewareConfig) => void;
  updateMiddleware: (mw: MiddlewareConfig) => void;
  deleteMiddleware: (id: string) => void;

  /* Services */
  addService: (svc: ServiceConfig) => Promise<void>;
  updateService: (svc: ServiceConfig) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  /* Data Storage */
  updateDataStorage: (config: DataStorageConfig) => void;

  /* Git Repo */
  updateGitRepo: (config: GitRepoConfig) => void;

  /* Frontend Pages */
  addPage: (page: UIPage) => void;
  updatePage: (page: UIPage) => void;
  deletePage: (id: string) => void;

  /* Pipelines */
  addPipeline: (pipeline: Pipeline) => void;
  updatePipeline: (pipeline: Pipeline) => void;
  deletePipeline: (id: string) => void;

  /* Bots */
  addBot: (bot: Bot) => void;
  updateBot: (bot: Bot) => void;
  deleteBot: (id: string) => void;

  /* API Paths */
  addApiPath: (path: ApiPath) => void;
  updateApiPath: (path: ApiPath) => void;
  deleteApiPath: (id: string) => void;

  /* Templates */
  addEntityTemplate: (templateKey: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Entity Template Packs (daily office use cases)                     */
/* ------------------------------------------------------------------ */

type EntitySeed = Omit<Entity, 'id'>;

export interface EntityTemplatePack {
  key: string;
  label: string;
  icon: string;
  description: string;
  entities: EntitySeed[];
}

const f = (
  name: string,
  type: EntitySeed['fields'][number]['type'],
  required = true,
  extra?: Partial<EntitySeed['fields'][number]>,
): EntitySeed['fields'][number] => ({ name, type, required, ...extra });

export const ENTITY_TEMPLATE_PACKS: EntityTemplatePack[] = [
  {
    key: 'hr',
    label: 'HR & People',
    icon: '👥',
    description: 'Employees, departments, leave requests, timesheets',
    entities: [
      {
        name: 'Employee',
        description: 'Company employee record',
        middlewareBindings: [],
        fields: [
          f('firstName', 'string'),
          f('lastName', 'string'),
          f('email', 'string'),
          f('phone', 'string', false),
          f('hireDate', 'date'),
          f('birthDate', 'date', false),
          f('salary', 'number'),
          f('isActive', 'boolean'),
          f('department', 'enum', true, {
            enumValues: [
              'engineering',
              'sales',
              'marketing',
              'hr',
              'finance',
              'operations',
              'support',
            ],
          }),
          f('role', 'enum', true, {
            enumValues: [
              'intern',
              'junior',
              'mid',
              'senior',
              'lead',
              'manager',
              'director',
              'vp',
            ],
          }),
          f('employeeId', 'uuid'),
          f('notes', 'string', false),
        ],
      },
      {
        name: 'Department',
        description: 'Organizational department',
        middlewareBindings: [],
        fields: [
          f('name', 'string'),
          f('code', 'string'),
          f('headCount', 'number'),
          f('budget', 'number', false),
          f('isActive', 'boolean'),
          f('location', 'enum', true, {
            enumValues: [
              'headquarters',
              'branch-east',
              'branch-west',
              'remote',
            ],
          }),
        ],
      },
      {
        name: 'LeaveRequest',
        description: 'Employee time-off request',
        middlewareBindings: [],
        fields: [
          f('requestId', 'uuid'),
          f('employeeName', 'string'),
          f('startDate', 'date'),
          f('endDate', 'date'),
          f('days', 'number'),
          f('type', 'enum', true, {
            enumValues: [
              'vacation',
              'sick',
              'personal',
              'parental',
              'bereavement',
              'unpaid',
            ],
          }),
          f('status', 'enum', true, {
            enumValues: ['pending', 'approved', 'rejected', 'cancelled'],
          }),
          f('reason', 'string', false),
          f('isUrgent', 'boolean'),
        ],
      },
      {
        name: 'Timesheet',
        description: 'Weekly hours log',
        middlewareBindings: [],
        fields: [
          f('timesheetId', 'uuid'),
          f('employeeName', 'string'),
          f('weekStarting', 'date'),
          f('hoursWorked', 'number'),
          f('overtimeHours', 'number', false),
          f('isSubmitted', 'boolean'),
          f('isApproved', 'boolean'),
          f('project', 'string', false),
          f('notes', 'string', false),
        ],
      },
    ],
  },
  {
    key: 'project-mgmt',
    label: 'Project Management',
    icon: '📋',
    description: 'Projects, tasks, sprints, milestones',
    entities: [
      {
        name: 'Project',
        description: 'Work project or initiative',
        middlewareBindings: [],
        fields: [
          f('projectId', 'uuid'),
          f('name', 'string'),
          f('description', 'string', false),
          f('startDate', 'date'),
          f('deadline', 'date', false),
          f('budget', 'number', false),
          f('progress', 'number'),
          f('status', 'enum', true, {
            enumValues: [
              'planning',
              'active',
              'on-hold',
              'completed',
              'cancelled',
            ],
          }),
          f('priority', 'enum', true, {
            enumValues: ['low', 'medium', 'high', 'critical'],
          }),
          f('isArchived', 'boolean'),
        ],
      },
      {
        name: 'Task',
        description: 'Individual work item',
        middlewareBindings: [],
        fields: [
          f('taskId', 'uuid'),
          f('title', 'string'),
          f('description', 'string', false),
          f('assignee', 'string', false),
          f('dueDate', 'date', false),
          f('estimatedHours', 'number', false),
          f('actualHours', 'number', false),
          f('status', 'enum', true, {
            enumValues: [
              'backlog',
              'todo',
              'in-progress',
              'in-review',
              'done',
              'blocked',
            ],
          }),
          f('priority', 'enum', true, {
            enumValues: ['low', 'medium', 'high', 'critical'],
          }),
          f('isBlocked', 'boolean'),
        ],
      },
      {
        name: 'Sprint',
        description: 'Agile sprint iteration',
        middlewareBindings: [],
        fields: [
          f('sprintId', 'uuid'),
          f('name', 'string'),
          f('startDate', 'date'),
          f('endDate', 'date'),
          f('goal', 'string', false),
          f('velocity', 'number', false),
          f('status', 'enum', true, {
            enumValues: ['planning', 'active', 'completed'],
          }),
          f('isActive', 'boolean'),
        ],
      },
      {
        name: 'Milestone',
        description: 'Project checkpoint',
        middlewareBindings: [],
        fields: [
          f('milestoneId', 'uuid'),
          f('title', 'string'),
          f('targetDate', 'date'),
          f('completedDate', 'date', false),
          f('isCompleted', 'boolean'),
          f('description', 'string', false),
        ],
      },
    ],
  },
  {
    key: 'crm',
    label: 'CRM & Sales',
    icon: '💼',
    description: 'Contacts, companies, deals, activities',
    entities: [
      {
        name: 'Contact',
        description: 'Business contact / lead',
        middlewareBindings: [],
        fields: [
          f('contactId', 'uuid'),
          f('firstName', 'string'),
          f('lastName', 'string'),
          f('email', 'string'),
          f('phone', 'string', false),
          f('company', 'string', false),
          f('jobTitle', 'string', false),
          f('lastContactDate', 'date', false),
          f('source', 'enum', true, {
            enumValues: [
              'website',
              'referral',
              'cold-call',
              'trade-show',
              'social-media',
              'advertisement',
            ],
          }),
          f('isLead', 'boolean'),
          f('notes', 'json', false),
        ],
      },
      {
        name: 'Company',
        description: 'Business organization',
        middlewareBindings: [],
        fields: [
          f('companyId', 'uuid'),
          f('name', 'string'),
          f('industry', 'string', false),
          f('website', 'string', false),
          f('employeeCount', 'number', false),
          f('annualRevenue', 'number', false),
          f('foundedDate', 'date', false),
          f('size', 'enum', true, {
            enumValues: ['startup', 'small', 'medium', 'enterprise'],
          }),
          f('isCustomer', 'boolean'),
        ],
      },
      {
        name: 'Deal',
        description: 'Sales opportunity / deal',
        middlewareBindings: [],
        fields: [
          f('dealId', 'uuid'),
          f('title', 'string'),
          f('value', 'number'),
          f('contactName', 'string'),
          f('expectedCloseDate', 'date', false),
          f('stage', 'enum', true, {
            enumValues: [
              'prospecting',
              'qualification',
              'proposal',
              'negotiation',
              'closed-won',
              'closed-lost',
            ],
          }),
          f('probability', 'number', false),
          f('isWon', 'boolean'),
          f('notes', 'string', false),
        ],
      },
      {
        name: 'Activity',
        description: 'CRM interaction log',
        middlewareBindings: [],
        fields: [
          f('activityId', 'uuid'),
          f('subject', 'string'),
          f('contactName', 'string', false),
          f('activityDate', 'date'),
          f('type', 'enum', true, {
            enumValues: [
              'call',
              'email',
              'meeting',
              'demo',
              'follow-up',
              'note',
            ],
          }),
          f('duration', 'number', false),
          f('isCompleted', 'boolean'),
          f('outcome', 'string', false),
        ],
      },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory & Warehouse',
    icon: '📦',
    description: 'Products, stock, suppliers, purchase orders',
    entities: [
      {
        name: 'InventoryItem',
        description: 'Warehouse stock item',
        middlewareBindings: [],
        fields: [
          f('itemId', 'uuid'),
          f('name', 'string'),
          f('sku', 'string'),
          f('quantity', 'number'),
          f('reorderLevel', 'number'),
          f('unitPrice', 'number'),
          f('location', 'string', false),
          f('category', 'enum', true, {
            enumValues: [
              'raw-material',
              'component',
              'finished-good',
              'packaging',
              'consumable',
            ],
          }),
          f('isLowStock', 'boolean'),
          f('lastRestocked', 'date', false),
        ],
      },
      {
        name: 'Supplier',
        description: 'Vendor or supplier',
        middlewareBindings: [],
        fields: [
          f('supplierId', 'uuid'),
          f('name', 'string'),
          f('contactEmail', 'string'),
          f('phone', 'string', false),
          f('leadTimeDays', 'number', false),
          f('rating', 'number', false),
          f('status', 'enum', true, {
            enumValues: ['active', 'inactive', 'blacklisted'],
          }),
          f('isPreferred', 'boolean'),
        ],
      },
      {
        name: 'PurchaseOrder',
        description: 'Order to supplier',
        middlewareBindings: [],
        fields: [
          f('poId', 'uuid'),
          f('supplierName', 'string'),
          f('orderDate', 'date'),
          f('expectedDelivery', 'date', false),
          f('totalAmount', 'number'),
          f('itemCount', 'number'),
          f('status', 'enum', true, {
            enumValues: [
              'draft',
              'submitted',
              'confirmed',
              'shipped',
              'received',
              'cancelled',
            ],
          }),
          f('isPaid', 'boolean'),
          f('notes', 'string', false),
        ],
      },
    ],
  },
  {
    key: 'meetings',
    label: 'Meetings & Scheduling',
    icon: '📅',
    description: 'Meetings, rooms, attendees, agendas',
    entities: [
      {
        name: 'Meeting',
        description: 'Scheduled meeting',
        middlewareBindings: [],
        fields: [
          f('meetingId', 'uuid'),
          f('title', 'string'),
          f('organizer', 'string'),
          f('date', 'date'),
          f('startTime', 'string'),
          f('endTime', 'string', false),
          f('room', 'string', false),
          f('attendeeCount', 'number', false),
          f('type', 'enum', true, {
            enumValues: [
              'standup',
              'one-on-one',
              'team-sync',
              'review',
              'planning',
              'all-hands',
              'external',
            ],
          }),
          f('isRecurring', 'boolean'),
          f('isVirtual', 'boolean'),
          f('notes', 'string', false),
          f('agenda', 'json', false),
        ],
      },
      {
        name: 'MeetingRoom',
        description: 'Bookable meeting room',
        middlewareBindings: [],
        fields: [
          f('roomId', 'uuid'),
          f('name', 'string'),
          f('floor', 'number'),
          f('capacity', 'number'),
          f('hasVideoConf', 'boolean'),
          f('hasWhiteboard', 'boolean'),
          f('isAvailable', 'boolean'),
          f('type', 'enum', true, {
            enumValues: [
              'small',
              'medium',
              'large',
              'boardroom',
              'phone-booth',
            ],
          }),
        ],
      },
      {
        name: 'ActionItem',
        description: 'Follow-up from meeting',
        middlewareBindings: [],
        fields: [
          f('actionId', 'uuid'),
          f('description', 'string'),
          f('assignee', 'string'),
          f('dueDate', 'date'),
          f('isCompleted', 'boolean'),
          f('priority', 'enum', true, {
            enumValues: ['low', 'medium', 'high'],
          }),
          f('meetingTitle', 'string', false),
        ],
      },
    ],
  },
  {
    key: 'helpdesk',
    label: 'IT Helpdesk & Support',
    icon: '🎫',
    description: 'Tickets, assets, knowledge base',
    entities: [
      {
        name: 'Ticket',
        description: 'Support ticket',
        middlewareBindings: [],
        fields: [
          f('ticketId', 'uuid'),
          f('subject', 'string'),
          f('description', 'string'),
          f('reportedBy', 'string'),
          f('assignedTo', 'string', false),
          f('createdDate', 'date'),
          f('resolvedDate', 'date', false),
          f('category', 'enum', true, {
            enumValues: [
              'hardware',
              'software',
              'network',
              'access',
              'email',
              'other',
            ],
          }),
          f('priority', 'enum', true, {
            enumValues: ['low', 'medium', 'high', 'urgent'],
          }),
          f('status', 'enum', true, {
            enumValues: [
              'open',
              'in-progress',
              'waiting',
              'resolved',
              'closed',
            ],
          }),
          f('isEscalated', 'boolean'),
        ],
      },
      {
        name: 'Asset',
        description: 'IT hardware / software asset',
        middlewareBindings: [],
        fields: [
          f('assetId', 'uuid'),
          f('name', 'string'),
          f('serialNumber', 'string', false),
          f('assignedTo', 'string', false),
          f('purchaseDate', 'date', false),
          f('warrantyExpiry', 'date', false),
          f('purchaseCost', 'number', false),
          f('type', 'enum', true, {
            enumValues: [
              'laptop',
              'desktop',
              'monitor',
              'phone',
              'printer',
              'software-license',
              'peripheral',
            ],
          }),
          f('status', 'enum', true, {
            enumValues: ['available', 'assigned', 'maintenance', 'retired'],
          }),
          f('isUnderWarranty', 'boolean'),
        ],
      },
      {
        name: 'KnowledgeArticle',
        description: 'Internal KB article',
        middlewareBindings: [],
        fields: [
          f('articleId', 'uuid'),
          f('title', 'string'),
          f('content', 'string'),
          f('author', 'string'),
          f('publishedDate', 'date', false),
          f('viewCount', 'number'),
          f('isPublished', 'boolean'),
          f('category', 'enum', true, {
            enumValues: [
              'how-to',
              'troubleshooting',
              'policy',
              'faq',
              'setup-guide',
            ],
          }),
        ],
      },
    ],
  },
  {
    key: 'finance',
    label: 'Finance & Expenses',
    icon: '💰',
    description: 'Invoices, expenses, budgets, approvals',
    entities: [
      {
        name: 'Invoice',
        description: 'Customer or vendor invoice',
        middlewareBindings: [],
        fields: [
          f('invoiceId', 'uuid'),
          f('invoiceNumber', 'string'),
          f('clientName', 'string'),
          f('amount', 'number'),
          f('tax', 'number', false),
          f('issueDate', 'date'),
          f('dueDate', 'date'),
          f('status', 'enum', true, {
            enumValues: [
              'draft',
              'sent',
              'paid',
              'overdue',
              'cancelled',
              'refunded',
            ],
          }),
          f('isPaid', 'boolean'),
          f('notes', 'string', false),
        ],
      },
      {
        name: 'ExpenseReport',
        description: 'Employee expense claim',
        middlewareBindings: [],
        fields: [
          f('expenseId', 'uuid'),
          f('employeeName', 'string'),
          f('description', 'string'),
          f('amount', 'number'),
          f('receiptDate', 'date'),
          f('category', 'enum', true, {
            enumValues: [
              'travel',
              'meals',
              'accommodation',
              'office-supplies',
              'software',
              'training',
              'other',
            ],
          }),
          f('status', 'enum', true, {
            enumValues: [
              'submitted',
              'under-review',
              'approved',
              'rejected',
              'reimbursed',
            ],
          }),
          f('hasReceipt', 'boolean'),
        ],
      },
      {
        name: 'Budget',
        description: 'Departmental or project budget',
        middlewareBindings: [],
        fields: [
          f('budgetId', 'uuid'),
          f('name', 'string'),
          f('allocated', 'number'),
          f('spent', 'number'),
          f('remaining', 'number'),
          f('fiscalYear', 'number'),
          f('startDate', 'date'),
          f('endDate', 'date'),
          f('isApproved', 'boolean'),
          f('status', 'enum', true, {
            enumValues: ['draft', 'active', 'frozen', 'closed'],
          }),
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers for immutable project updates                              */
/* ------------------------------------------------------------------ */

const patchActive = (
  projects: Project[],
  activeId: string | null,
  updater: (p: Project) => Project,
): Project[] =>
  projects.map(p =>
    p.id === activeId
      ? updater({ ...p, updatedAt: new Date().toISOString() })
      : p,
  );

/* ------------------------------------------------------------------ */
/*  Debounced DB helpers                                               */
/* ------------------------------------------------------------------ */

/** Debounced spec sync — avoids writing to Supabase on every keystroke. */
let specSyncTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSpecSync(projectId: string, spec: string): void {
  if (specSyncTimer) clearTimeout(specSyncTimer);
  specSyncTimer = setTimeout(() => {
    supabaseDb
      .updateProject(projectId, { openApiSpec: spec })
      .catch(err =>
        console.error('[store] supabaseDb.updateProject (spec) failed:', err),
      );
  }, 800);
}

/* ------------------------------------------------------------------ */
/*  Store implementation                                               */
/* ------------------------------------------------------------------ */

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      activeProject: () => {
        const p = get().projects.find(
          proj => proj.id === get().activeProjectId,
        );
        if (!p) return undefined;
        return migrateProjectCached(p as unknown as Record<string, unknown>);
      },

      /* ---- Project CRUD ---- */
      addProject: async (name, description) => {
        const project = createProject(name, description);
        const { user } = useAuthStore.getState();
        project.userId = user?.id ?? null;
        if (user) {
          project.accountId = await fetchAccountIdForUser(user.id);
        }
        set(s => ({
          projects: [...s.projects, project],
          activeProjectId: project.id,
        }));
        supabaseDb
          .createProject(project)
          .catch(err =>
            console.error('[store] supabaseDb.createProject failed:', err),
          );
        return project.id;
      },

      deleteProject: id => {
        set(s => ({
          projects: s.projects.filter(p => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        }));
        supabaseDb
          .deleteProject(id)
          .catch(err =>
            console.error('[store] supabaseDb.deleteProject failed:', err),
          );
      },

      setActiveProject: id => set({ activeProjectId: id }),

      updateProject: (id, patch) => {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === id
              ? { ...p, ...patch, updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
        supabaseDb
          .updateProject(id, patch)
          .catch(err =>
            console.error('[store] supabaseDb.updateProject failed:', err),
          );
      },

      /* ---- Spec ---- */
      updateSpec: spec => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            openApiSpec: spec,
          })),
        }));
        if (pid) {
          debouncedSpecSync(pid, spec);
        }
      },

      /* ---- Entities ---- */
      addEntity: entity => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            entities: [...p.entities, entity],
          })),
        }));
        if (pid) {
          supabaseDb
            .createEntity(pid, entity)
            .catch(err =>
              console.error('[store] supabaseDb.createEntity failed:', err),
            );
        }
      },

      updateEntity: entity => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            entities: p.entities.map(e => (e.id === entity.id ? entity : e)),
          })),
        }));
        supabaseDb
          .updateEntity(entity.id, entity)
          .catch(err =>
            console.error('[store] supabaseDb.updateEntity failed:', err),
          );
      },

      deleteEntity: id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            entities: p.entities.filter(e => e.id !== id),
            relations: p.relations.filter(
              r => r.sourceEntityId !== id && r.targetEntityId !== id,
            ),
          })),
        }));
        supabaseDb
          .deleteEntity(id)
          .catch(err =>
            console.error('[store] supabaseDb.deleteEntity failed:', err),
          );
      },

      deleteAllEntities: () => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            entities: [],
            relations: [],
          })),
        }));
        if (pid) {
          Promise.all([
            supabaseDb.deleteAllEntitiesForProject(pid),
            supabaseDb.deleteAllRelationsForProject(pid),
          ]).catch(err =>
            console.error('[store] supabaseDb.deleteAllEntities failed:', err),
          );
        }
      },

      /* ---- Relations ---- */
      addRelation: relation => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            relations: [...p.relations, relation],
          })),
        }));
        if (pid) {
          supabaseDb
            .createRelation(pid, relation)
            .catch(err =>
              console.error('[store] supabaseDb.createRelation failed:', err),
            );
        }
      },

      updateRelation: relation => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            relations: p.relations.map(r =>
              r.id === relation.id ? relation : r,
            ),
          })),
        }));
        supabaseDb
          .updateRelation(relation.id, relation)
          .catch(err =>
            console.error('[store] supabaseDb.updateRelation failed:', err),
          );
      },

      deleteRelation: id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            relations: p.relations.filter(r => r.id !== id),
          })),
        }));
        supabaseDb
          .deleteRelation(id)
          .catch(err =>
            console.error('[store] supabaseDb.deleteRelation failed:', err),
          );
      },

      /* ---- Middlewares ---- */
      addMiddleware: mw => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            middlewares: [...p.middlewares, mw],
          })),
        }));
        if (pid) {
          supabaseDb
            .createMiddleware(pid, mw)
            .catch(err =>
              console.error('[store] supabaseDb.createMiddleware failed:', err),
            );
        }
      },

      updateMiddleware: mw => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            middlewares: p.middlewares.map(m => (m.id === mw.id ? mw : m)),
          })),
        }));
        supabaseDb
          .updateMiddleware(mw.id, mw)
          .catch(err =>
            console.error('[store] supabaseDb.updateMiddleware failed:', err),
          );
      },

      deleteMiddleware: id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            middlewares: p.middlewares.filter(m => m.id !== id),
            entities: p.entities.map(e => ({
              ...e,
              middlewareBindings: (e.middlewareBindings ?? []).filter(
                b => b.middlewareId !== id,
              ),
            })),
          })),
        }));
        supabaseDb
          .deleteMiddleware(id)
          .catch(err =>
            console.error('[store] supabaseDb.deleteMiddleware failed:', err),
          );
      },

      /* ---- Services ---- */
      addService: async svc => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            services: [...p.services, svc],
          })),
        }));
        if (pid) {
          try {
            await supabaseDb.createService(pid, svc);
          } catch (err) {
            console.error('[store] supabaseDb.createService failed:', err);
          }
        }
      },

      updateService: async svc => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            services: p.services.map(sv => (sv.id === svc.id ? svc : sv)),
          })),
        }));
        try {
          await supabaseDb.updateService(svc.id, svc);
        } catch (err) {
          console.error('[store] supabaseDb.updateService failed:', err);
        }
      },

      deleteService: async id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            services: p.services.filter(sv => sv.id !== id),
          })),
        }));
        try {
          await supabaseDb.deleteService(id);
        } catch (err) {
          console.error('[store] supabaseDb.deleteService failed:', err);
        }
      },

      /* ---- Data Storage ---- */
      updateDataStorage: config => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            dataStorage: config,
          })),
        }));
        if (pid) {
          supabaseDb
            .updateProject(pid, { dataStorage: config })
            .catch(err =>
              console.error(
                '[store] supabaseDb.updateProject (dataStorage) failed:',
                err,
              ),
            );
        }
      },

      /* ---- Git Repo ---- */
      updateGitRepo: config => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            gitRepo: config,
          })),
        }));
        if (pid) {
          supabaseDb
            .updateProject(pid, { gitRepo: config })
            .catch(err =>
              console.error(
                '[store] supabaseDb.updateProject (gitRepo) failed:',
                err,
              ),
            );
        }
      },

      /* ---- Frontend Pages ---- */
      addPage: page => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            pages: [...p.pages, page],
          })),
        }));
        if (pid) {
          supabaseDb
            .createPage(pid, page)
            .catch(err =>
              console.error('[store] supabaseDb.createPage failed:', err),
            );
        }
      },

      updatePage: page => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            pages: p.pages.map(pg => (pg.id === page.id ? page : pg)),
          })),
        }));
        supabaseDb
          .updatePage(page.id, page)
          .catch(err =>
            console.error('[store] supabaseDb.updatePage failed:', err),
          );
      },

      deletePage: id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            pages: p.pages.filter(pg => pg.id !== id),
          })),
        }));
        supabaseDb
          .deletePage(id)
          .catch(err =>
            console.error('[store] supabaseDb.deletePage failed:', err),
          );
      },

      /* ---- Pipelines ---- */
      addPipeline: pipeline => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            pipelines: [...p.pipelines, pipeline],
          })),
        }));
        if (pid) {
          supabaseDb
            .createPipeline(pid, pipeline)
            .catch(err =>
              console.error('[store] supabaseDb.createPipeline failed:', err),
            );
        }
      },

      updatePipeline: pipeline => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            pipelines: p.pipelines.map(pl =>
              pl.id === pipeline.id ? pipeline : pl,
            ),
          })),
        }));
        supabaseDb
          .updatePipeline(pipeline.id, pipeline)
          .catch(err =>
            console.error('[store] supabaseDb.updatePipeline failed:', err),
          );
      },

      deletePipeline: id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            pipelines: p.pipelines.filter(pl => pl.id !== id),
          })),
        }));
        supabaseDb
          .deletePipeline(id)
          .catch(err =>
            console.error('[store] supabaseDb.deletePipeline failed:', err),
          );
      },

      /* ---- Bots ---- */
      addBot: bot => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            bots: [...p.bots, bot],
          })),
        }));
        if (pid) {
          supabaseDb
            .createBot(pid, bot)
            .catch(err =>
              console.error('[store] supabaseDb.createBot failed:', err),
            );
        }
      },

      updateBot: bot => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            bots: p.bots.map(b => (b.id === bot.id ? bot : b)),
          })),
        }));
        supabaseDb
          .updateBot(bot.id, bot)
          .catch(err =>
            console.error('[store] supabaseDb.updateBot failed:', err),
          );
      },

      deleteBot: id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            bots: p.bots.filter(b => b.id !== id),
            pipelines: p.pipelines.map(pl => ({
              ...pl,
              steps: pl.steps.map(step =>
                step.botId === id ? { ...step, botId: undefined } : step,
              ),
            })),
          })),
        }));
        supabaseDb
          .deleteBot(id)
          .catch(err =>
            console.error('[store] supabaseDb.deleteBot failed:', err),
          );
      },

      /* ---- API Paths ---- */
      addApiPath: path => {
        const pid = get().activeProjectId;
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            apiPaths: [...(p.apiPaths ?? []), path],
          })),
        }));
        if (pid) {
          supabaseDb
            .createApiPath(pid, path)
            .catch(err =>
              console.error('[store] supabaseDb.createApiPath failed:', err),
            );
        }
      },

      updateApiPath: path => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            apiPaths: (p.apiPaths ?? []).map(ap =>
              ap.id === path.id ? path : ap,
            ),
          })),
        }));
        supabaseDb
          .updateApiPath(path.id, path)
          .catch(err =>
            console.error('[store] supabaseDb.updateApiPath failed:', err),
          );
      },

      deleteApiPath: id => {
        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => ({
            ...p,
            apiPaths: (p.apiPaths ?? []).filter(ap => ap.id !== id),
          })),
        }));
        supabaseDb
          .deleteApiPath(id)
          .catch(err =>
            console.error('[store] supabaseDb.deleteApiPath failed:', err),
          );
      },

      addEntityTemplate: templateKey => {
        const pid = get().activeProjectId;
        const projectBefore = get().activeProject();
        const existingNames = new Set(
          projectBefore?.entities.map(e => e.name) ?? [],
        );

        set(s => ({
          projects: patchActive(s.projects, s.activeProjectId, p => {
            const pack = ENTITY_TEMPLATE_PACKS.find(t => t.key === templateKey);
            if (!pack) return p;
            const newEntities: Entity[] = pack.entities
              .filter(seed => !existingNames.has(seed.name))
              .map(seed => ({ ...seed, id: uuidV4() }));
            if (newEntities.length === 0) return p;
            return { ...p, entities: [...p.entities, ...newEntities] };
          }),
        }));

        // Persist new template entities to Supabase
        if (pid) {
          const projectAfter = get().activeProject();
          const newEntities = (projectAfter?.entities ?? []).filter(
            e => !existingNames.has(e.name),
          );
          if (newEntities.length > 0) {
            Promise.all(
              newEntities.map(e => supabaseDb.createEntity(pid, e)),
            ).catch(err =>
              console.error(
                '[store] supabaseDb template entities failed:',
                err,
              ),
            );
          }
        }
      },
    }),
    {
      name: 'swaggen-next-store',

      version: 8,
      storage: createJSONStorage(() => supabaseStorage),
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 8) {
          const projects = (
            (state.projects as Record<string, unknown>[]) ?? []
          ).map(migrateProject);
          return { ...state, projects };
        }
        return state;
      },
    },
  ),
);

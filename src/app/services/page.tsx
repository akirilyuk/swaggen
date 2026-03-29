'use client';

import Editor from '@monaco-editor/react';
import {
  Code,
  Heart,
  LayoutTemplate,
  Package,
  Plus,
  Trash2,
  Workflow,
} from 'lucide-react';
import { useRef, useState, type ComponentProps } from 'react';
import { v4 as uuidV4 } from 'uuid';

import PageShell from '@/components/PageShell';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import {
  DEFAULT_SERVICE_CODE,
  SERVICE_TEMPLATES,
} from '@/lib/serviceTemplates';
import { toSlug } from '@/lib/projectRegistry';
import {
  insertMethodStub,
  parseMethodsFromCode,
  reconcileMethods,
  removeMethodFromCode,
  renameMethodInCode,
  updateMethodSignature,
} from '@/lib/codeSyncUtils';
import { useProjectStore } from '@/store/projectStore';
import type {
  ServiceConfig,
  ServiceDependency,
  ServiceMethod,
} from '@/types/project';
import type { Monaco } from '@monaco-editor/react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const emptyDep = (): ServiceDependency => ({ name: '', version: '' });
const TEMPLATE_DEPS_EDITOR_LIB_URI = 'file:///types/template-deps.d.ts';
const KNOWN_TEMPLATE_DEPS = new Set([
  'jsonwebtoken',
  'resend',
  '@aws-sdk/client-s3',
  'redis',
]);
const COMMON_CUSTOM_DEPS = [
  'axios',
  'zod',
  'lodash',
  'dayjs',
  'uuid',
  'openai',
  '@supabase/supabase-js',
  'fs',
  'path',
  'crypto',
  'stream',
  'util',
  'events',
];
const TEMPLATE_DEPS_EDITOR_LIB = `declare module 'jsonwebtoken' {
  const jwt: {
    sign: (...args: unknown[]) => string;
    verify: (...args: unknown[]) => unknown;
    decode: (...args: unknown[]) => unknown;
  };
  export default jwt;
}

declare module 'resend' {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(payload: unknown): Promise<unknown>;
    };
  }
}

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config?: unknown);
    send(command: unknown): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(input?: unknown);
  }
  export class GetObjectCommand {
    constructor(input?: unknown);
  }
}

// Monaco occasionally drops imported symbol context while editing; keep
// command names available as global constructor fallbacks for templates.
declare class S3Client {
  constructor(config?: unknown);
  send(command: unknown): Promise<any>;
}
declare class PutObjectCommand {
  constructor(input?: unknown);
}
declare class GetObjectCommand {
  constructor(input?: unknown);
}

declare module 'redis' {
  export function createClient(config?: unknown): {
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(
      key: string,
      value: string,
      options?: { EX?: number },
    ): Promise<unknown>;
    del(key: string): Promise<unknown>;
  };
}

declare const process: {
  env: Record<string, string | undefined>;
};

declare class Buffer extends Uint8Array {}
`;

type DefinitionModel = {
  getLineContent: (lineNumber: number) => string;
  getWordAtPosition: (
    pos: { lineNumber: number; column: number },
  ) => { word: string } | null;
};

type EditorMouseEvent = {
  target: { position: { lineNumber: number; column: number } | null };
  event: { browserEvent: MouseEvent };
};

type CursorPositionEvent = {
  source: string;
  position: { lineNumber: number; column: number };
};

function extractBareModuleSpecifiers(code: string): string[] {
  const out = new Set<string>();
  const importFrom = /from\s+['"]([^'"]+)['"]/g;
  const importOnly = /import\s+['"]([^'"]+)['"]/g;
  const requireCall = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  const collect = (re: RegExp) => {
    let match: RegExpExecArray | null;
    while ((match = re.exec(code))) {
      const mod = (match[1] ?? '').trim();
      if (!mod) continue;
      if (mod.startsWith('.') || mod.startsWith('/')) continue;
      if (mod.startsWith('@/')) continue;
      out.add(mod);
    }
  };

  collect(importFrom);
  collect(importOnly);
  collect(requireCall);
  return [...out];
}
const BASE_SERVICE_EDITOR_SOURCE_URI = 'file:///src/lib/baseService.ts';
const BASE_SERVICE_EDITOR_SOURCE = `export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  details?: Record<string, unknown>;
}

export class ServiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      details?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = options?.code ?? 'SERVICE_ERROR';
    this.status = options?.status ?? 500;
    this.details = {
      ...(options?.details ?? {}),
      ...(options?.cause !== undefined ? { cause: String(options.cause) } : {}),
    };
  }
}

export abstract class BaseService {
  abstract readonly serviceName: string;

  abstract healthCheck(): Promise<HealthCheckResult>;

  protected healthy(details?: Record<string, unknown>): HealthCheckResult {
    return {
      service: this.serviceName,
      healthy: true,
      ...(details ? { details } : {}),
    };
  }

  protected unhealthy(details?: Record<string, unknown>): HealthCheckResult {
    return {
      service: this.serviceName,
      healthy: false,
      ...(details ? { details } : {}),
    };
  }

  protected ok(details?: Record<string, unknown>): HealthCheckResult {
    return this.healthy(details);
  }

  protected fail(details?: Record<string, unknown>): HealthCheckResult {
    return this.unhealthy(details);
  }

  protected async execute<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      this.log('debug', operation, 'ok', \`\${Date.now() - startedAt}ms\`);
      return result;
    } catch (err) {
      const mapped = this.toServiceError(err);
      this.log('error', operation, mapped.code, mapped.message, mapped.details);
      throw mapped;
    }
  }

  protected async health(
    check: () => Promise<HealthCheckResult>,
  ): Promise<HealthCheckResult> {
    try {
      return await check();
    } catch (err) {
      const mapped = this.toServiceError(err);
      return this.fail({
        code: mapped.code,
        error: mapped.message,
        ...(mapped.details ?? {}),
      });
    }
  }

  protected requireEnv(name: string): string {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env;
    const value = env?.[name];
    if (!value) {
      throw new ServiceError(\`Missing required env var: \${name}\`, {
        code: 'MISSING_ENV',
        status: 500,
        details: { env: name },
      });
    }
    return value;
  }

  protected toServiceError(err: unknown): ServiceError {
    if (err instanceof ServiceError) return err;
    if (err instanceof Error) {
      return new ServiceError(err.message, {
        code: 'UNEXPECTED_ERROR',
        status: 500,
        details: { name: err.name },
      });
    }
    return new ServiceError('Unknown service error', {
      code: 'UNKNOWN_ERROR',
      status: 500,
      details: { raw: String(err) },
    });
  }

  protected log(level: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]) {
    const prefix = \`[service:\${this.serviceName}]\`;
    const fn =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log;
    fn(prefix, ...args);
  }
}
`;
let baseServiceDefinitionProviderRegistered = false;

function normalizeBaseServiceImport(code: string): string {
  const normalized = code
    .replace(
      /from\s+['"]@\/lib\/baseService['"]/g,
      "from '../lib/baseService'",
    )
    .replace(
      /from\s+['"]\.\/lib\/baseService['"]/g,
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
  if (insertAt === -1) {
    filtered.push(canonicalImport);
  } else {
    filtered.splice(insertAt, 0, canonicalImport);
  }

  return filtered.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Collapsible section                                                */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
      >
        {icon}
        {title}
        <span className="ml-auto text-xs text-zinc-400">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ServicesPage() {
  const project = useProjectStore(s => s.activeProject());
  const addService = useProjectStore(s => s.addService);
  const updateService = useProjectStore(s => s.updateService);
  const deleteService = useProjectStore(s => s.deleteService);

  const [editing, setEditing] = useState<ServiceConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateEntityId, setTemplateEntityId] = useState('');
  const [showBaseServiceRef, setShowBaseServiceRef] = useState(false);
  const [serviceDeleteTarget, setServiceDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const registeredDepUrisRef = useRef<Set<string>>(new Set());
  const editorPath = editing
    ? `file:///src/services/${editing.name || editing.id || 'Service'}.ts`
    : 'file:///src/services/Service.ts';

  const registerCustomDependencyLibs = (
    monaco: Monaco,
    code: string,
    dependencies: ServiceDependency[] = [],
  ) => {
    const dynamicModules = new Set<string>(COMMON_CUSTOM_DEPS);
    for (const dep of dependencies) {
      if (dep.name?.trim()) dynamicModules.add(dep.name.trim());
    }
    for (const mod of extractBareModuleSpecifiers(code)) {
      if (!KNOWN_TEMPLATE_DEPS.has(mod)) dynamicModules.add(mod);
    }

    for (const mod of dynamicModules) {
      const safe = mod.replace(/[^a-zA-Z0-9@/_-]/g, '_');
      const uri = `file:///types/custom-deps/${safe}.d.ts`;
      if (registeredDepUrisRef.current.has(uri)) continue;
      registeredDepUrisRef.current.add(uri);
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `declare module '${mod.replace(/'/g, "\\'")}';`,
        uri,
      );
    }
  };

  const configureServiceEditor = (monaco: Monaco) => {
    monacoRef.current = monaco;
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      baseUrl: 'file:///',
      paths: {
        '@/*': ['src/*'],
      },
    });
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      TEMPLATE_DEPS_EDITOR_LIB,
      TEMPLATE_DEPS_EDITOR_LIB_URI,
    );
    registerCustomDependencyLibs(monaco, editing?.code ?? '', editing?.dependencies ?? []);

    const sourceUri = monaco.Uri.parse(BASE_SERVICE_EDITOR_SOURCE_URI);
    if (!monaco.editor.getModel(sourceUri)) {
      monaco.editor.createModel(
        BASE_SERVICE_EDITOR_SOURCE,
        'typescript',
        sourceUri,
      );
    }

    if (!baseServiceDefinitionProviderRegistered) {
      const symbols = [
        'BaseService',
        'HealthCheckResult',
        'ServiceError',
        'baseService',
      ];
      const sourceModel = monaco.editor.getModel(sourceUri);
      monaco.languages.registerDefinitionProvider('typescript', {
        provideDefinition(
          model: DefinitionModel,
          position: { lineNumber: number; column: number },
        ) {
          const line = model.getLineContent(position.lineNumber);
          if (
            !line.includes("@/lib/baseService") &&
            !line.includes("../lib/baseService")
          )
            return [];
          const word = model.getWordAtPosition(position);
          if (!word || !symbols.includes(word.word)) return [];
          if (!sourceModel) return [];

          const targetLine =
            word.word === 'baseService'
              ? 0
              : sourceModel
                  .getValue()
                  .split('\n')
                  .findIndex((l: string) => l.includes(` ${word.word}`));
          if (targetLine < 0) return [];

          return [
            {
              uri: sourceUri,
              range: {
                startLineNumber: targetLine + 1,
                startColumn: 1,
                endLineNumber: targetLine + 1,
                endColumn: sourceModel.getLineLength(targetLine + 1) + 1,
              },
            },
          ];
        },
      });
      baseServiceDefinitionProviderRegistered = true;
    }
  };

  const openBaseServiceReference = () => {
    setShowBaseServiceRef(true);
    requestAnimationFrame(() => {
      document
        .getElementById('base-service-ref-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const mountServiceEditor = (
    editor: Parameters<NonNullable<ComponentProps<typeof Editor>['onMount']>>[0],
  ) => {
    if (monacoRef.current) {
      registerCustomDependencyLibs(
        monacoRef.current,
        editor.getValue(),
        editing?.dependencies ?? [],
      );
    }
    const openReferenceIfMatched = (
      pos: { lineNumber: number; column: number } | null | undefined,
      browserEvent?: MouseEvent,
    ) => {
      if (!pos) return;
      const model = editor.getModel();
      if (!model) return;
      const line = model.getLineContent(pos.lineNumber);
      const word = model.getWordAtPosition(pos);
      const allowedWord = word?.word
        ? ['BaseService', 'HealthCheckResult', 'ServiceError', 'baseService'].includes(
            word.word,
          )
        : false;
      const clickedImportPath =
        line.includes('../lib/baseService') || line.includes('@/lib/baseService');
      if (!allowedWord && !clickedImportPath) return;
      browserEvent?.preventDefault();
      browserEvent?.stopPropagation();
      openBaseServiceReference();
    };

    editor.onMouseDown((e: EditorMouseEvent) => {
      openReferenceIfMatched(e.target.position, e.event.browserEvent);
    });

    editor.onMouseUp((e: EditorMouseEvent) => {
      openReferenceIfMatched(e.target.position, e.event.browserEvent);
    });

    editor.onDidChangeCursorPosition((e: CursorPositionEvent) => {
      if (e.source !== 'mouse') return;
      const model = editor.getModel();
      if (!model) return;
      const line = model.getLineContent(e.position.lineNumber);
      const word = model.getWordAtPosition(e.position);
      const allowedWord = word?.word
        ? ['BaseService', 'HealthCheckResult', 'ServiceError', 'baseService'].includes(
            word.word,
          )
        : false;
      const clickedImportPath =
        line.includes('../lib/baseService') || line.includes('@/lib/baseService');
      if (!allowedWord && !clickedImportPath) return;
      openBaseServiceReference();
    });
  };

  if (!project) {
    return (
      <PageShell title="Services">
        <EmptyState
          icon={<Workflow size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const entityOptions = [
    { value: '', label: '— None —' },
    ...project.entities.map(e => ({ value: e.id, label: e.name })),
  ];

  /* ---- Actions ---- */

  const startCreate = () => {
    setEditing({
      id: uuidV4(),
      name: '',
      description: '',
      methods: [],
      code: DEFAULT_SERVICE_CODE,
      dependencies: [],
      healthCheck: { enabled: true, path: '/health/', code: '' },
    });
    setIsNew(true);
    setShowTemplates(false);
    openBaseServiceReference();
  };

  const applyTemplate = async (templateId: string) => {
    const tmpl = SERVICE_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    const entity = tmpl.requiresEntity
      ? project.entities.find(e => e.id === templateEntityId)
      : undefined;
    if (tmpl.requiresEntity && !entity) return;
    await addService(tmpl.build(uuidV4(), entity));
    setShowTemplates(false);
    setTemplateEntityId('');
  };

  const startEdit = (svc: ServiceConfig) => {
    const legacy = svc as ServiceConfig & { imports?: string };
    const codeSource =
      svc.code && svc.code.trim().length > 0
        ? svc.code
        : `${legacy.imports ?? ''}${svc.code ?? ''}`;
    const code = normalizeBaseServiceImport(codeSource);
    // Migrate legacy entityId to type strings
    const migratedMethods = svc.methods.map(m => {
      const legacyName = m.entityId
        ? project.entities.find(e => e.id === m.entityId)?.name
        : undefined;
      return {
        ...m,
        inputType: m.inputType ?? legacyName,
        outputType: m.outputType ?? legacyName,
      };
    });
    // Reconcile from code — code is the source of truth
    const parsed = parseMethodsFromCode(code);
    const methods = reconcileMethods(migratedMethods, parsed);
    setEditing({
      ...svc,
      methods,
      dependencies: (svc.dependencies ?? []).map(d => ({ ...d })),
      code,
      healthCheck: svc.healthCheck ? { ...svc.healthCheck } : undefined,
    });
    setIsNew(false);
    setShowTemplates(false);
    openBaseServiceReference();
  };

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    setIsSaving(true);
    const editingWithoutLegacy = { ...(editing as ServiceConfig & { imports?: string }) };
    delete editingWithoutLegacy.imports;
    const cleaned: ServiceConfig = {
      ...editingWithoutLegacy,
      code: normalizeBaseServiceImport(editing.code ?? ''),
      methods: editing.methods.filter(m => m.name.trim()),
      dependencies: editing.dependencies.filter(d => d.name.trim()),
    };
    try {
      if (isNew) await addService(cleaned);
      else await updateService(cleaned);
      setEditing(null);
    } catch (err) {
      console.error('[services] save failed:', err);
      alert('Saving failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ---- Method helpers (with code sync) ---- */

  const updateMethod = (i: number, patch: Partial<ServiceMethod>) => {
    if (!editing) return;
    const oldMethod = editing.methods[i];
    const updated = { ...oldMethod, ...patch };
    let code = editing.code ?? '';

    // Sync name changes to code
    if (
      patch.name !== undefined &&
      patch.name !== oldMethod.name &&
      oldMethod.name
    ) {
      code = renameMethodInCode(code, oldMethod.name, patch.name);
    }

    // Update signature if types changed
    if (patch.inputType !== undefined || patch.outputType !== undefined) {
      code = updateMethodSignature(
        code,
        updated.name,
        updated.inputType,
        updated.outputType,
      );
    }

    // Re-reconcile so UI stays in sync with code
    const parsed = parseMethodsFromCode(code);
    const methods = reconcileMethods(
      editing.methods.map((m, idx) => (idx === i ? updated : m)),
      parsed,
    );
    setEditing({ ...editing, code, methods });
  };

  const addMethod = () => {
    if (!editing) return;
    // Generate a unique default name
    const existingNames = new Set(editing.methods.map(m => m.name));
    let name = 'newFunction';
    let counter = 1;
    while (existingNames.has(name)) {
      name = `newFunction${counter++}`;
    }
    // Insert stub into code — reconciliation will pick it up
    const code = insertMethodStub(editing.code ?? '', name);
    const parsed = parseMethodsFromCode(code);
    const methods = reconcileMethods(editing.methods, parsed);
    setEditing({ ...editing, code, methods });
  };

  const removeMethod = (i: number) => {
    if (!editing) return;
    const method = editing.methods[i];
    let code = editing.code ?? '';
    if (method.name) {
      code = removeMethodFromCode(code, method.name);
    }
    // Re-reconcile from code
    const parsed = parseMethodsFromCode(code);
    const methods = reconcileMethods(editing.methods, parsed);
    setEditing({ ...editing, code, methods });
  };

  /** Sync: code editor → UI method list */
  const syncMethodsFromCode = (code: string) => {
    if (!editing) return;
    if (monacoRef.current) {
      registerCustomDependencyLibs(
        monacoRef.current,
        code,
        editing.dependencies ?? [],
      );
    }
    const parsed = parseMethodsFromCode(code);
    const synced = reconcileMethods(editing.methods, parsed);
    setEditing({ ...editing, code, methods: synced });
  };

  /* ---- Dependency helpers ---- */

  const updateDep = (i: number, patch: Partial<ServiceDependency>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      dependencies: editing.dependencies.map((d, idx) =>
        idx === i ? { ...d, ...patch } : d,
      ),
    });
  };
  const removeDep = (i: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      dependencies: editing.dependencies.filter((_, idx) => idx !== i),
    });
  };

  const healthCount = project.services.filter(
    s => s.healthCheck?.enabled,
  ).length;
  const depCount = project.services.reduce(
    (n, s) => n + (s.dependencies?.length ?? 0),
    0,
  );
  const projectSlug = toSlug(project.name);

  /* ---- Render ---- */

  return (
    <PageShell
      title="Services"
      description={`Define services for "${project.name}"`}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <LayoutTemplate size={16} /> Templates
          </Button>
          <Button onClick={startCreate}>
            <Plus size={16} /> Add Service
          </Button>
        </div>
      }
    >
      {/* ---- Health & deps summary ---- */}
      {(healthCount > 0 || depCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {healthCount > 0 && (
            <a
              href={`/api/${projectSlug}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm transition-colors hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/40"
            >
              <Heart size={14} className="text-emerald-600" />
              <span className="text-emerald-800 dark:text-emerald-300">
                <strong>{healthCount}</strong> service
                {healthCount !== 1 && 's'} →{' '}
                <code className="rounded bg-emerald-100 px-1 text-xs dark:bg-emerald-900/40">
                  GET /health
                </code>
              </span>
            </a>
          )}
          {depCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm dark:border-violet-800 dark:bg-violet-900/20">
              <Package size={14} className="text-violet-600" />
              <span className="text-violet-800 dark:text-violet-300">
                <strong>{depCount}</strong> external dependency
                {depCount !== 1 && 'ies'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ---- Template picker ---- */}
      {showTemplates && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
            Service Templates
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            Pick a template to scaffold a service with code, methods, and
            dependencies pre-filled.
          </p>

          {project.entities.length > 0 && (
            <div className="mb-4">
              <Select
                label="Target Entity (for entity-based templates)"
                id="template-entity"
                value={templateEntityId}
                onChange={e => setTemplateEntityId(e.target.value)}
                options={entityOptions}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_TEMPLATES.map(tmpl => {
              const disabled = tmpl.requiresEntity && !templateEntityId;
              return (
                <div
                  key={tmpl.id}
                  className={`flex flex-col gap-2 rounded-lg border p-4 ${
                    disabled ? 'opacity-50' : ''
                  } border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutTemplate size={14} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {tmpl.name}
                    </span>
                    {tmpl.requiresEntity && (
                      <Badge variant="warning">entity</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{tmpl.description}</p>
                  <Button
                    size="sm"
                    disabled={disabled}
                    onClick={() => applyTemplate(tmpl.id)}
                  >
                    Create
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ---- Editor ---- */}
      {editing && (
        <Card className="max-w-5xl">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {isNew ? 'New Service' : `Edit "${editing.name}"`}
          </h2>

          <div className="flex flex-col gap-4">
            {/* Name / description row */}
            <div className="flex flex-wrap gap-4">
              <Input
                label="Service Name"
                id="svc-name"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                placeholder="UserService"
                className="flex-1"
                autoFocus
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Heart
                  size={14}
                  className={
                    editing.healthCheck?.enabled
                      ? 'text-emerald-500'
                      : 'text-zinc-400'
                  }
                />
                <input
                  type="checkbox"
                  checked={editing.healthCheck?.enabled ?? false}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      healthCheck: {
                        enabled: e.target.checked,
                        path:
                          editing.healthCheck?.path ??
                          `/health/${editing.name?.toLowerCase() || 'service'}`,
                        code: '',
                      },
                    })
                  }
                  className="rounded"
                />
                Health check
              </label>
            </div>

            <Textarea
              label="Description"
              id="svc-desc"
              value={editing.description}
              onChange={e =>
                setEditing({ ...editing, description: e.target.value })
              }
              rows={2}
            />

            {editing.healthCheck?.enabled && (
              <Input
                label="Health Check Path"
                id="hc-path"
                value={editing.healthCheck.path}
                onChange={e =>
                  setEditing({
                    ...editing,
                    healthCheck: {
                      ...editing.healthCheck!,
                      path: e.target.value,
                    },
                  })
                }
                placeholder="/health/my-service"
              />
            )}

            {/* Service code */}
            <Section
              title="Service Code"
              icon={<Code size={14} className="text-blue-500" />}
            >
              <p className="mb-2 text-xs text-zinc-500">
                Write the full service file — imports at the top, then your
                class or functions. Methods you write here will appear in the
                Exposed Functions list below automatically.
              </p>
              <div className="mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openBaseServiceReference}
                >
                  Open BaseService reference
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
                <Editor
                  path={editorPath}
                  height="380px"
                  language="typescript"
                  theme="vs-dark"
                  value={editing.code ?? ''}
                  onChange={v => syncMethodsFromCode(v ?? '')}
                  beforeMount={configureServiceEditor}
                  onMount={mountServiceEditor}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
              {showBaseServiceRef && (
                <div
                  id="base-service-ref-panel"
                  className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Referenced file: <code>src/lib/baseService.ts</code>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBaseServiceRef(false)}
                    >
                      Close
                    </Button>
                  </div>
                  <Editor
                    path={BASE_SERVICE_EDITOR_SOURCE_URI}
                    height="260px"
                    language="typescript"
                    theme="vs-dark"
                    value={BASE_SERVICE_EDITOR_SOURCE}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              )}
            </Section>

            {/* Exposed functions */}
            <Section
              title={`Exposed Functions (${editing.methods.length})`}
              icon={<Workflow size={14} className="text-amber-500" />}
              defaultOpen={editing.methods.length > 0}
            >
              <p className="mb-2 text-xs text-zinc-500">
                Functions listed here are synced with the service code above.
                Adding or removing a function updates the code automatically.
              </p>
              <div className="space-y-3">
                {editing.methods.map((method, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        label="Function Name"
                        id={`m-name-${idx}`}
                        value={method.name}
                        onChange={e =>
                          updateMethod(idx, { name: e.target.value })
                        }
                        placeholder="listUsers"
                        className="flex-1"
                      />
                      <Input
                        label="Description"
                        id={`m-desc-${idx}`}
                        value={method.description}
                        onChange={e =>
                          updateMethod(idx, { description: e.target.value })
                        }
                        placeholder="List all users"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMethod(idx)}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        label="Input Type (parameter)"
                        id={`m-input-${idx}`}
                        value={method.inputType ?? ''}
                        onChange={e =>
                          updateMethod(idx, {
                            inputType: e.target.value || undefined,
                          })
                        }
                        placeholder="e.g. User, string, { name: string }"
                        className="flex-1"
                      />
                      <Select
                        label="← from entity"
                        id={`m-input-entity-${idx}`}
                        value={
                          project.entities.find(
                            en => en.name === method.inputType,
                          )?.id ?? ''
                        }
                        onChange={e => {
                          if (!e.target.value) {
                            updateMethod(idx, { inputType: '{}' });
                            return;
                          }
                          const ent = project.entities.find(
                            en => en.id === e.target.value,
                          );
                          if (ent) updateMethod(idx, { inputType: ent.name });
                        }}
                        options={entityOptions}
                      />
                      <Input
                        label="Output Type (return)"
                        id={`m-output-${idx}`}
                        value={method.outputType ?? ''}
                        onChange={e =>
                          updateMethod(idx, {
                            outputType: e.target.value || undefined,
                          })
                        }
                        placeholder="e.g. User[], void, { id: string }"
                        className="flex-1"
                      />
                      <Select
                        label="← from entity"
                        id={`m-output-entity-${idx}`}
                        value={
                          project.entities.find(
                            en => en.name === method.outputType,
                          )?.id ?? ''
                        }
                        onChange={e => {
                          if (!e.target.value) {
                            updateMethod(idx, { outputType: '{}' });
                            return;
                          }
                          const ent = project.entities.find(
                            en => en.id === e.target.value,
                          );
                          if (ent) updateMethod(idx, { outputType: ent.name });
                        }}
                        options={entityOptions}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={addMethod}
              >
                <Plus size={14} /> Add Function
              </Button>
            </Section>

            {/* Dependencies */}
            <Section
              title={`Dependencies (${editing.dependencies.length})`}
              icon={<Package size={14} className="text-violet-500" />}
              defaultOpen={editing.dependencies.length > 0}
            >
              <p className="mb-2 text-xs text-zinc-500">
                npm packages required by this service. These will be merged into
                the generated <code>service-dependencies.json</code>.
              </p>
              <div className="space-y-2">
                {editing.dependencies.map((dep, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <Input
                      label={idx === 0 ? 'Package' : undefined}
                      id={`dep-name-${idx}`}
                      value={dep.name}
                      onChange={e => updateDep(idx, { name: e.target.value })}
                      placeholder="axios"
                      className="flex-1"
                    />
                    <Input
                      label={idx === 0 ? 'Version' : undefined}
                      id={`dep-ver-${idx}`}
                      value={dep.version}
                      onChange={e =>
                        updateDep(idx, { version: e.target.value })
                      }
                      placeholder="^2.0.0"
                      className="w-28"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDep(idx)}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() =>
                  setEditing({
                    ...editing,
                    dependencies: [...editing.dependencies, emptyDep()],
                  })
                }
              >
                <Plus size={14} /> Add Dependency
              </Button>
            </Section>

            <div className="flex gap-2">
              <Button onClick={save} disabled={!editing.name.trim() || isSaving}>
                {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ---- Empty state ---- */}
      {project.services.length === 0 && !editing && !showTemplates && (
        <EmptyState
          icon={<Workflow size={48} />}
          title="No services yet"
          description="Services can be full CRUD classes or small utility snippets with external dependencies. Every service exposes a health check."
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowTemplates(true)}
              >
                <LayoutTemplate size={16} /> Browse Templates
              </Button>
              <Button onClick={startCreate}>
                <Plus size={16} /> Custom Service
              </Button>
            </div>
          }
        />
      )}

      {/* ---- Service list ---- */}
      {project.services.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.services.map(svc => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              projectSlug={projectSlug}
              onEdit={() => startEdit(svc)}
              onDelete={() =>
                setServiceDeleteTarget({ id: svc.id, name: svc.name })
              }
            />
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!serviceDeleteTarget}
        title="Delete service?"
        description={
          serviceDeleteTarget
            ? `Delete “${serviceDeleteTarget.name}”? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (serviceDeleteTarget) deleteService(serviceDeleteTarget.id);
          setServiceDeleteTarget(null);
        }}
        onCancel={() => setServiceDeleteTarget(null)}
      />
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Service card                                                       */
/* ------------------------------------------------------------------ */

function ServiceCard({
  svc,
  projectSlug,
  onEdit,
  onDelete,
}: {
  svc: ServiceConfig;
  projectSlug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const depCount = svc.dependencies?.length ?? 0;
  const isSnippet = svc.methods.length === 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isSnippet ? (
            <Code size={14} className="text-violet-500" />
          ) : (
            <Workflow size={14} className="text-amber-500" />
          )}
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            {svc.name}
          </h3>
        </div>
        <div className="flex gap-1">
          {svc.healthCheck?.enabled && (
            <Badge variant="success">
              <Heart size={9} className="mr-0.5" /> Health
            </Badge>
          )}
          {isSnippet && <Badge variant="default">snippet</Badge>}
        </div>
      </div>

      {svc.description && (
        <p className="mt-1 text-sm text-zinc-500">{svc.description}</p>
      )}

      {svc.methods.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {svc.methods.map(m => (
            <Badge key={m.name}>{m.name}</Badge>
          ))}
        </div>
      )}

      {depCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {svc.dependencies.map(d => (
            <span
              key={d.name}
              className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
            >
              <Package size={8} /> {d.name}
            </span>
          ))}
        </div>
      )}

      {svc.healthCheck?.enabled && (
        <a
          href={`/api/${projectSlug}${svc.healthCheck.path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <Heart size={9} />
          <code>{svc.healthCheck.path}</code>
        </a>
      )}

      <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 size={14} className="text-red-500" />
        </Button>
      </div>
    </Card>
  );
}

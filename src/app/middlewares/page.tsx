'use client';

import Editor from '@monaco-editor/react';
import {
  Box,
  Globe,
  Layers,
  Play,
  Plus,
  Route,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { MIDDLEWARE_PRESETS } from '@/lib/middlewarePresets';
import { useActionLog } from '@/components/designer/ActionLogContext';
import { buildMiddlewarePreviewApiPath } from '@/lib/swaggenRequestMeta';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import {
  ALL_HTTP_METHODS,
  type Entity,
  type HttpMethod,
  type MiddlewareConfig,
  type MiddlewareScope,
} from '@/types/project';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global — runs on every request' },
  { value: 'route', label: 'Route — assigned per entity' },
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DEFAULT_CODE = `import { NextRequest, NextResponse } from 'next/server';
import type { PipelineContext, SwaggenMiddlewareResult } from '../lib/middleware';

/**
 * Custom middleware — implement your business logic here.
 *
 * Read from ctx:   ctx.requestId, ctx.projectId, ctx.userId, ctx.custom.myValue
 * Write to ctx:    return { ctx: { custom: { myValue: 'hello' } } }
 * Short-circuit:   return { response: NextResponse.json({}, { status: 403 }) }
 */
export async function handler(
  req: NextRequest,
  ctx: PipelineContext,
): Promise<SwaggenMiddlewareResult> {
  // Your logic here
  return {};
}
`;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MiddlewaresPage() {
  const project = useProjectStore(s => s.activeProject());
  const user = useAuthStore(s => s.user);
  const addMiddleware = useProjectStore(s => s.addMiddleware);
  const updateMiddleware = useProjectStore(s => s.updateMiddleware);
  const deleteMiddleware = useProjectStore(s => s.deleteMiddleware);
  const { log } = useActionLog();

  const [editing, setEditing] = useState<MiddlewareConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<unknown>(null);
  const [previewMethod, setPreviewMethod] = useState<HttpMethod>('GET');
  const [previewPath, setPreviewPath] = useState('/preview');
  const [previewHeadersJson, setPreviewHeadersJson] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MiddlewareConfig | null>(
    null,
  );

  useEffect(() => {
    log('info', 'Middlewares page opened');
  }, [log]);

  if (!project) {
    return (
      <PageShell title="Middlewares">
        <EmptyState
          icon={<Layers size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const existingNames = new Set(project.middlewares.map(m => m.name));

  const startCreate = (scope: MiddlewareScope = 'route') => {
    log('info', 'New middleware draft', scope === 'global' ? 'global scope' : 'route scope');
    setEditing({
      id: uuidV4(),
      name: '',
      description: '',
      enabled: true,
      order: project.middlewares.length,
      scope,
      isPreset: false,
      code: DEFAULT_CODE,
    });
    setIsNew(true);
    setShowPresets(false);
  };

  const addPreset = (preset: typeof MIDDLEWARE_PRESETS[number]) => {
    const mw: MiddlewareConfig = {
      id: uuidV4(),
      name: preset.name,
      description: preset.description,
      enabled: true,
      order: project.middlewares.length,
      scope: preset.scope,
      isPreset: true,
      code: preset.code,
    };
    addMiddleware(mw);
    log('success', 'Middleware preset added', `${preset.name} (${preset.scope})`);
  };

  const startEdit = (mw: MiddlewareConfig) => {
    log('info', 'Middleware edit opened', mw.name);
    setEditing({ ...mw });
    setIsNew(false);
    setShowPresets(false);
  };

  const save = () => {
    if (!editing || !editing.name.trim()) return;
    if (isNew) {
      addMiddleware(editing);
      log('success', 'Middleware created', `${editing.name} (${editing.scope})`);
    } else {
      updateMiddleware(editing);
      log('success', 'Middleware updated', `${editing.name} (${editing.scope})`);
    }
    setEditing(null);
  };

  const runPreview = async () => {
    if (!editing) return;
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      let headers: Record<string, string> | undefined;
      if (previewHeadersJson.trim()) {
        const parsed: unknown = JSON.parse(previewHeadersJson);
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          log(
            'error',
            'Middleware preview failed',
            'Headers must be a JSON object',
          );
          setPreviewResult({
            error:
              'Headers must be a JSON object, e.g. {"Authorization":"Bearer x"}',
          });
          setPreviewLoading(false);
          return;
        }
        headers = parsed as Record<string, string>;
      }
      const previewUrl = buildMiddlewarePreviewApiPath(
        project.id,
        user?.id?.trim() || '_',
      );
      const res = await fetch(previewUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editing.code,
          name: editing.name || 'preview',
          method: previewMethod,
          path: previewPath,
          headers,
          body: previewBody.trim() ? previewBody : null,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error?: unknown }).error)
            : `HTTP ${res.status}`;
        log('error', 'Middleware preview failed', msg);
        setPreviewResult(
          typeof data === 'object' && data !== null && 'error' in data
            ? data
            : { error: `Request failed (${res.status})`, details: data },
        );
      } else {
        log('success', 'Middleware preview run', editing.name || 'preview');
        setPreviewResult(data);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log('error', 'Middleware preview error', msg);
      setPreviewResult({
        error: msg,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const globalMws = project.middlewares
    .filter(m => m.scope === 'global')
    .sort((a, b) => a.order - b.order);
  const routeMws = project.middlewares
    .filter(m => m.scope !== 'global')
    .sort((a, b) => a.order - b.order);

  return (
    <PageShell
      title="Middlewares"
      description={`Configure global and per-route middlewares for "${project.name}"`}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const next = !showPresets;
              setShowPresets(next);
              log('info', next ? 'Preset browser opened' : 'Preset browser closed');
            }}
          >
            <Sparkles size={16} /> Presets
          </Button>
          <Button onClick={() => startCreate('route')}>
            <Plus size={16} /> New Middleware
          </Button>
        </div>
      }
    >
      {/* ---- Preset picker ---- */}
      {showPresets && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
            Built-in Middleware Presets
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            One-click add common middlewares. You can customise their code after
            adding.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MIDDLEWARE_PRESETS.map(preset => {
              const alreadyAdded = existingNames.has(preset.name);
              return (
                <div
                  key={preset.name}
                  className={`flex flex-col gap-2 rounded-lg border p-4 ${
                    alreadyAdded
                      ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900'
                      : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {preset.scope === 'global' ? (
                      <Globe size={14} className="text-blue-500" />
                    ) : (
                      <Route size={14} className="text-amber-500" />
                    )}
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {preset.name}
                    </span>
                    <Badge
                      variant={
                        preset.scope === 'global' ? 'success' : 'warning'
                      }
                    >
                      {preset.scope}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{preset.description}</p>
                  <Button
                    size="sm"
                    variant={alreadyAdded ? 'secondary' : 'primary'}
                    disabled={alreadyAdded}
                    onClick={() => addPreset(preset)}
                  >
                    {alreadyAdded ? 'Added' : 'Add'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ---- Editor ---- */}
      {editing && (
        <Card className="max-w-4xl">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {isNew ? 'New Middleware' : `Edit "${editing.name}"`}
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              <Input
                label="Name"
                id="mw-name"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                placeholder="auth"
                className="flex-1"
                autoFocus
              />
              <Select
                label="Scope"
                id="mw-scope"
                value={editing.scope}
                onChange={e =>
                  setEditing({
                    ...editing,
                    scope: e.target.value as MiddlewareScope,
                  })
                }
                options={SCOPE_OPTIONS}
              />
              <Input
                label="Order"
                id="mw-order"
                type="number"
                value={editing.order}
                onChange={e =>
                  setEditing({
                    ...editing,
                    order: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-24"
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={e =>
                    setEditing({ ...editing, enabled: e.target.checked })
                  }
                  className="rounded"
                />
                Enabled
              </label>
            </div>
            <Textarea
              label="Description"
              id="mw-desc"
              value={editing.description}
              onChange={e =>
                setEditing({ ...editing, description: e.target.value })
              }
              rows={2}
              placeholder="What does this middleware do?"
            />

            {/* Code editor */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Middleware Code
              </span>
              <div className="overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
                <Editor
                  height="300px"
                  language="typescript"
                  theme="vs-dark"
                  value={editing.code}
                  onChange={value =>
                    setEditing({ ...editing, code: value ?? '' })
                  }
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={runPreview}
                disabled={previewLoading}
              >
                <Play size={16} />
                {previewLoading ? 'Running…' : 'Run preview'}
              </Button>
              <Button onClick={save} disabled={!editing.name.trim()}>
                {isNew ? 'Create' : 'Save'}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>

            <details className="rounded-lg border border-zinc-200 dark:border-zinc-700">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Mock request (method, path, headers, body)
              </summary>
              <div className="space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-700">
                <div className="flex flex-wrap gap-4">
                  <Select
                    label="Method"
                    id="preview-method"
                    value={previewMethod}
                    onChange={e =>
                      setPreviewMethod(e.target.value as HttpMethod)
                    }
                    options={ALL_HTTP_METHODS.map(m => ({
                      value: m,
                      label: m,
                    }))}
                  />
                  <Input
                    label="Path or full URL"
                    id="preview-path"
                    value={previewPath}
                    onChange={e => setPreviewPath(e.target.value)}
                    placeholder="/preview or https://example.com/api"
                    className="min-w-[220px] flex-1"
                  />
                </div>
                <Textarea
                  label="Headers (JSON object, optional)"
                  id="preview-headers"
                  value={previewHeadersJson}
                  onChange={e => setPreviewHeadersJson(e.target.value)}
                  rows={3}
                  placeholder='{"Authorization": "Bearer token"}'
                  className="font-mono text-xs"
                />
                <Textarea
                  label="Body (for POST/PUT/PATCH)"
                  id="preview-body"
                  value={previewBody}
                  onChange={e => setPreviewBody(e.target.value)}
                  rows={4}
                  placeholder='{"hello":"world"}'
                  className="font-mono text-xs"
                />
              </div>
            </details>

            {previewResult !== null && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Output
                </span>
                <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-300 bg-zinc-950 p-3 text-xs text-emerald-100 dark:border-zinc-600">
                  {JSON.stringify(previewResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---- Empty state ---- */}
      {project.middlewares.length === 0 && !editing && !showPresets && (
        <EmptyState
          icon={<Layers size={48} />}
          title="No middlewares yet"
          description="Add global middlewares (log, cors, rate-limit) or route-scoped ones (auth, validate)."
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPresets(true);
                  log('info', 'Preset browser opened', 'from empty state');
                }}
              >
                <Sparkles size={16} /> Browse Presets
              </Button>
              <Button onClick={() => startCreate('route')}>
                <Plus size={16} /> Custom Middleware
              </Button>
            </div>
          }
        />
      )}

      {/* ---- Global middlewares section ---- */}
      {globalMws.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
            <Globe size={16} className="text-blue-500" />
            Global Middlewares
            <span className="text-xs font-normal text-zinc-500">
              — run on every request, in order
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {globalMws.map(mw => (
              <MiddlewareCard
                key={mw.id}
                mw={mw}
                entities={project.entities}
                onEdit={() => startEdit(mw)}
                onDelete={() => setDeleteTarget(mw)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- Route middlewares section ---- */}
      {routeMws.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
            <Route size={16} className="text-amber-500" />
            Route Middlewares
            <span className="text-xs font-normal text-zinc-500">
              — assign to specific entities
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {routeMws.map(mw => (
              <MiddlewareCard
                key={mw.id}
                mw={mw}
                entities={project.entities}
                onEdit={() => startEdit(mw)}
                onDelete={() => setDeleteTarget(mw)}
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete middleware?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMiddleware(deleteTarget.id);
          log('warning', 'Middleware deleted', deleteTarget.name);
          setDeleteTarget(null);
        }}
      />
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Middleware card sub-component                                       */
/* ------------------------------------------------------------------ */

function MiddlewareCard({
  mw,
  entities,
  onEdit,
  onDelete,
}: {
  mw: MiddlewareConfig;
  entities: Entity[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Find entities that use this middleware
  const usedBy =
    mw.scope === 'global'
      ? entities // global middlewares run on all entities
      : entities.filter(e =>
          (e.middlewareBindings ?? []).some(
            b => b.middlewareId === mw.id && b.methods.length > 0,
          ),
        );

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {mw.scope === 'global' ? (
            <Globe size={14} className="text-blue-500" />
          ) : (
            <Route size={14} className="text-amber-500" />
          )}
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            {mw.name}
          </h3>
        </div>
        <div className="flex gap-1">
          <Badge variant={mw.enabled ? 'success' : 'default'}>
            {mw.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <Badge>#{mw.order}</Badge>
          {mw.isPreset && <Badge variant="default">Preset</Badge>}
        </div>
      </div>
      {mw.description && (
        <p className="mt-1 text-sm text-zinc-500">{mw.description}</p>
      )}

      {/* Entities using this middleware */}
      {usedBy.length > 0 ? (
        <div className="mt-2">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {mw.scope === 'global' ? 'Applies to all entities' : 'Used by'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {usedBy.map(entity => {
              const binding = (entity.middlewareBindings ?? []).find(
                b => b.middlewareId === mw.id,
              );
              return (
                <span
                  key={entity.id}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <Box size={10} className="text-zinc-400" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {entity.name}
                  </span>
                  {/* Show method badges for route-scoped middlewares */}
                  {mw.scope === 'route' && binding && (
                    <span className="flex gap-0.5">
                      {binding.methods.map(method => (
                        <span
                          key={method}
                          className={`rounded px-1 py-px text-[8px] font-bold leading-tight ${METHOD_COLORS[method]}`}
                        >
                          {method}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ) : mw.scope === 'route' ? (
        <p className="mt-2 text-xs italic text-zinc-400">
          Not assigned to any entity yet
        </p>
      ) : null}

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

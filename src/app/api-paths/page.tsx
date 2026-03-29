'use client';

import {
  ChevronDown,
  ChevronRight,
  Copy,
  Globe,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';

import PageShell from '@/components/PageShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { toSlug } from '@/lib/projectRegistry';
import { useProjectStore } from '@/store/projectStore';
import type { ApiPath, ApiPathOperation, HttpMethod } from '@/types/project';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const emptyOperation = (): ApiPathOperation => ({
  id: uuidV4(),
  method: 'GET',
  summary: '',
  description: '',
  inputType: '',
  outputType: '',
  middlewareIds: [],
  tags: [],
});

const emptyApiPath = (): ApiPath => ({
  id: uuidV4(),
  path: '',
  description: '',
  operations: [emptyOperation()],
});

function normalizeProjectPath(input: string, projectSlug: string): string {
  let path = input.trim();
  if (!path) return '';

  // Accept full copied URLs and keep only pathname.
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      // keep raw path
    }
  }

  path = path.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;

  const prefixed = `/api/${projectSlug}`;
  if (path === prefixed) path = '/';
  else if (path.startsWith(`${prefixed}/`)) path = path.slice(prefixed.length);
  else if (path === '/api') path = '/';
  else if (path.startsWith('/api/')) path = path.slice('/api'.length);

  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ApiPathsPage() {
  const project = useProjectStore(s => s.activeProject());
  const addApiPath = useProjectStore(s => s.addApiPath);
  const updateApiPath = useProjectStore(s => s.updateApiPath);
  const deleteApiPath = useProjectStore(s => s.deleteApiPath);

  const [editing, setEditing] = useState<ApiPath | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!project) {
    return (
      <PageShell title="API Paths">
        <EmptyState
          icon={<Globe size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const apiPaths = project.apiPaths ?? [];
  const entities = project.entities;
  const middlewares = project.middlewares;
  const projectSlug = toSlug(project.name);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  /* ---- helpers ---- */

  const startCreate = () => {
    setEditing(emptyApiPath());
    setIsNew(true);
  };

  const startEdit = (ap: ApiPath) => {
    setEditing({ ...ap, operations: ap.operations.map(o => ({ ...o })) });
    setIsNew(false);
  };

  const cancel = () => {
    setEditing(null);
    setIsNew(false);
  };

  const save = () => {
    if (!editing || !editing.path.trim()) return;
    const normalizedPath = normalizeProjectPath(editing.path, projectSlug);
    const normalized: ApiPath = { ...editing, path: normalizedPath };
    if (isNew) {
      addApiPath(normalized);
    } else {
      updateApiPath(normalized);
    }
    setEditing(null);
    setIsNew(false);
  };

  /* ---- operation helpers ---- */

  const addOperation = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      operations: [...editing.operations, emptyOperation()],
    });
  };

  const removeOperation = (idx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      operations: editing.operations.filter((_, i) => i !== idx),
    });
  };

  const updateOperation = (idx: number, patch: Partial<ApiPathOperation>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      operations: editing.operations.map((op, i) =>
        i === idx ? { ...op, ...patch } : op,
      ),
    });
  };

  const toggleMiddleware = (opIdx: number, mwId: string) => {
    if (!editing) return;
    const op = editing.operations[opIdx];
    const next = op.middlewareIds.includes(mwId)
      ? op.middlewareIds.filter(id => id !== mwId)
      : [...op.middlewareIds, mwId];
    updateOperation(opIdx, { middlewareIds: next });
  };

  /* ---- entity type options ---- */
  const entityTypeOptions = [
    { value: '', label: '— none / custom —' },
    ...entities.flatMap(e => [
      { value: e.name, label: e.name },
      { value: `${e.name}[]`, label: `${e.name}[]` },
    ]),
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <PageShell
      title="API Paths"
      description={`Manually define HTTP paths for "${project.name}"`}
      actions={
        !editing && (
          <Button onClick={startCreate}>
            <Plus size={16} /> New Path
          </Button>
        )
      }
    >
      {/* ---- Editor ---- */}
      {editing && (
        <Card className="mb-6 p-6 space-y-5">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            {isNew ? 'New API Path' : `Edit ${editing.path}`}
          </h3>

          {/* Path + description */}
          <div className="flex gap-3">
            <Input
              label="Path"
              value={editing.path}
              onChange={e => setEditing({ ...editing, path: e.target.value })}
              placeholder="/users or /users/{id}"
              className="flex-1 font-mono"
            />
            <Input
              label="Description (optional)"
              value={editing.description ?? ''}
              onChange={e =>
                setEditing({ ...editing, description: e.target.value })
              }
              placeholder="What this path does…"
              className="flex-1"
            />
          </div>

          {/* Operations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Operations
              </span>
              <Button variant="secondary" size="sm" onClick={addOperation}>
                <Plus size={14} /> Add Operation
              </Button>
            </div>

            {editing.operations.map((op, opIdx) => (
              <div
                key={op.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/50"
              >
                {/* Row 1: method + summary + delete */}
                <div className="flex items-end gap-3">
                  <Select
                    label="Method"
                    value={op.method}
                    onChange={e =>
                      updateOperation(opIdx, {
                        method: e.target.value as HttpMethod,
                      })
                    }
                    options={HTTP_METHODS.map(m => ({ value: m, label: m }))}
                    className="w-32"
                  />
                  <Input
                    label="Summary"
                    value={op.summary}
                    onChange={e =>
                      updateOperation(opIdx, { summary: e.target.value })
                    }
                    placeholder="e.g. Create a user"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOperation(opIdx)}
                    className="h-9 w-9 p-0 text-red-500 shrink-0"
                    title="Remove operation"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                {/* Row 2: input / output types */}
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Select
                      label="Input Type (from entity)"
                      value={
                        entities.some(
                          e =>
                            e.name === op.inputType ||
                            `${e.name}[]` === op.inputType,
                        )
                          ? op.inputType ?? ''
                          : ''
                      }
                      onChange={e =>
                        updateOperation(opIdx, {
                          inputType: e.target.value || undefined,
                        })
                      }
                      options={entityTypeOptions}
                    />
                    <Input
                      value={op.inputType ?? ''}
                      onChange={e =>
                        updateOperation(opIdx, {
                          inputType: e.target.value || undefined,
                        })
                      }
                      placeholder="or type manually, e.g. { name: string }"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Select
                      label="Output Type (from entity)"
                      value={
                        entities.some(
                          e =>
                            e.name === op.outputType ||
                            `${e.name}[]` === op.outputType,
                        )
                          ? op.outputType ?? ''
                          : ''
                      }
                      onChange={e =>
                        updateOperation(opIdx, {
                          outputType: e.target.value || undefined,
                        })
                      }
                      options={entityTypeOptions}
                    />
                    <Input
                      value={op.outputType ?? ''}
                      onChange={e =>
                        updateOperation(opIdx, {
                          outputType: e.target.value || undefined,
                        })
                      }
                      placeholder="or type manually, e.g. { id: string }"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Row 3: description */}
                <Textarea
                  label="Description (optional)"
                  value={op.description ?? ''}
                  onChange={e =>
                    updateOperation(opIdx, { description: e.target.value })
                  }
                  placeholder="Detailed description of what this operation does…"
                  rows={2}
                />

                {/* Row 4: middlewares */}
                {middlewares.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
                      <Layers size={11} className="inline mr-1" />
                      Middlewares
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {middlewares.map(mw => {
                        const active = op.middlewareIds.includes(mw.id);
                        return (
                          <button
                            key={mw.id}
                            onClick={() => toggleMiddleware(opIdx, mw.id)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-all ${
                              active
                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 hover:border-blue-300'
                            }`}
                          >
                            {mw.name}
                            {!mw.enabled && (
                              <span className="ml-1 opacity-50">(off)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Row 5: tags */}
                <Input
                  label="Tags (comma-separated)"
                  value={op.tags.join(', ')}
                  onChange={e =>
                    updateOperation(opIdx, {
                      tags: e.target.value
                        .split(',')
                        .map(t => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g. users, auth"
                />
              </div>
            ))}
          </div>

          {/* Save / cancel */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!editing.path.trim()}>
              {isNew ? 'Create Path' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      )}

      {/* ---- List ---- */}
      {apiPaths.length === 0 && !editing ? (
        <EmptyState
          icon={<Globe size={48} />}
          title="No API paths yet"
          description="Define HTTP paths manually. Entities no longer auto-generate CRUD routes."
          action={
            <Button onClick={startCreate}>
              <Plus size={16} /> New Path
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {apiPaths.map(ap => {
            const isExpanded = expandedId === ap.id;
            const liveUrl = `${baseUrl}/api/${projectSlug}${ap.path}`;
            return (
              <Card key={ap.id} className="overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ap.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown
                        size={16}
                        className="text-zinc-400 shrink-0"
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="text-zinc-400 shrink-0"
                      />
                    )}
                    <code className="text-sm font-mono font-bold text-zinc-900 dark:text-white truncate">
                      {ap.path}
                    </code>
                    {ap.description && (
                      <span className="text-xs text-zinc-400 truncate">
                        — {ap.description}
                      </span>
                    )}
                  </button>

                  {/* Method badges */}
                  <div className="flex gap-1 shrink-0">
                    {ap.operations.map(op => (
                      <span
                        key={op.id}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          METHOD_COLORS[op.method]
                        }`}
                      >
                        {op.method}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => navigator.clipboard.writeText(liveUrl)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-mono transition-colors"
                      title={`Copy URL: ${liveUrl}`}
                    >
                      <Copy size={10} />
                      /api/{projectSlug}
                      {ap.path}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(ap)}
                      className="h-8 w-8 p-0"
                      title="Edit"
                    >
                      <Globe size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiPath(ap.id)}
                      className="h-8 w-8 p-0 text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                {/* Expanded operations */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-3">
                    {ap.operations.map(op => {
                      const opMiddlewares = op.middlewareIds
                        .map(id => middlewares.find(m => m.id === id)?.name)
                        .filter(Boolean);
                      return (
                        <div
                          key={op.id}
                          className="flex items-start gap-3 text-sm"
                        >
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                              METHOD_COLORS[op.method]
                            }`}
                          >
                            {op.method}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">
                              {op.summary || '—'}
                            </span>
                            {(op.inputType || op.outputType) && (
                              <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                                {op.inputType && (
                                  <span>
                                    in:{' '}
                                    <code className="text-zinc-700 dark:text-zinc-300">
                                      {op.inputType}
                                    </code>
                                  </span>
                                )}
                                {op.outputType && (
                                  <span>
                                    out:{' '}
                                    <code className="text-zinc-700 dark:text-zinc-300">
                                      {op.outputType}
                                    </code>
                                  </span>
                                )}
                              </div>
                            )}
                            {opMiddlewares.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {opMiddlewares.map(name => (
                                  <Badge key={name} variant="default">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

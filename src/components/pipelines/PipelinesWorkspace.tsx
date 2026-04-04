'use client';

import { Edit2, Play, Plus, Trash2, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { useActionLog } from '@/components/designer/ActionLogContext';
import { useProjectStore } from '@/store/projectStore';
import type { HttpMethod, Pipeline, PipelineStep } from '@/types/project';
import { ALL_HTTP_METHODS } from '@/types/project';

import {
  PipelineRunResultPanel,
  type PipelineRunResponse,
} from './PipelineRunResultPanel';

const METHOD_OPTIONS = ALL_HTTP_METHODS.map(m => ({ value: m, label: m }));

function countMiddlewareChains(steps: PipelineStep[]): number {
  return steps.filter(s => s.type === 'middleware').length;
}

function middlewareStepsOnly(pipeline: Pipeline): Pipeline {
  return {
    ...pipeline,
    steps: [...pipeline.steps].filter(s => s.type === 'middleware'),
  };
}

export function PipelinesWorkspace() {
  const project = useProjectStore(s => s.activeProject());
  const addPipeline = useProjectStore(s => s.addPipeline);
  const updatePipeline = useProjectStore(s => s.updatePipeline);
  const deletePipeline = useProjectStore(s => s.deletePipeline);

  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [runningPipelineId, setRunningPipelineId] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<{
    tone: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<Record<string, string>>({});
  const [lastRunDetail, setLastRunDetail] = useState<{
    pipelineId: string;
    pipelineName: string;
    ranAt: string;
    httpStatus: number;
    payload: PipelineRunResponse | null;
    rawJson: string;
  } | null>(null);

  const [simMethod, setSimMethod] = useState<HttpMethod>('GET');
  const [simPath, setSimPath] = useState('/preview');
  const [simBody, setSimBody] = useState('');

  const { log } = useActionLog();

  useEffect(() => {
    log('info', 'Pipelines page opened');
  }, [log]);

  if (!project) {
    return (
      <PageShell title="Middleware pipelines">
        <EmptyState
          icon={<Workflow size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const middlewareNameById = new Map(
    project.middlewares.map(mw => [mw.id, mw.name] as const),
  );

  const startCreatePipeline = () => {
    log('info', 'Pipeline create started');
    setEditingPipeline({
      id: uuidV4(),
      name: '',
      description: '',
      steps: [],
    });
  };

  const savePipeline = () => {
    if (!editingPipeline || !editingPipeline.name.trim()) return;
    const exists = project.pipelines.some(p => p.id === editingPipeline.id);
    const cleaned = middlewareStepsOnly(editingPipeline);
    if (exists) updatePipeline(cleaned);
    else addPipeline(cleaned);
    log(
      'success',
      exists ? 'Pipeline updated' : 'Pipeline created',
      cleaned.name,
    );
    setEditingPipeline(null);
  };

  const addMiddlewareStep = () => {
    if (!editingPipeline) return;
    const n = editingPipeline.steps.filter(s => s.type === 'middleware').length;
    const newStep: PipelineStep = {
      id: uuidV4(),
      type: 'middleware',
      name: `Middleware chain ${n + 1}`,
      config: { middlewareIds: [] },
      order: editingPipeline.steps.length,
    };
    setEditingPipeline({
      ...editingPipeline,
      steps: [...editingPipeline.steps, newStep],
    });
  };

  const runPipelineNow = async (pipeline: Pipeline) => {
    setRunningPipelineId(pipeline.id);
    log('info', 'Pipeline run started', pipeline.name);
    const runnable = middlewareStepsOnly(pipeline);
    const path = simPath.startsWith('/') ? simPath : `/${simPath}`;

    try {
      const res = await fetch('/api/pipelines/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline: runnable,
          middlewares: project.middlewares,
          method: simMethod,
          path,
          body:
            simBody.trim() &&
            ['POST', 'PUT', 'PATCH'].includes(simMethod)
              ? simBody
              : null,
        }),
      });

      const rawText = await res.text();
      let data: PipelineRunResponse = {};
      try {
        data = JSON.parse(rawText) as PipelineRunResponse;
      } catch {
        data = { error: rawText || 'Invalid JSON response' };
      }

      const ranAt = new Date().toLocaleString();

      setLastRunDetail({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        ranAt,
        httpStatus: res.status,
        payload: data,
        rawJson: rawText,
      });

      if (!res.ok || !data.ok) {
        const msg = data.error || `Run failed with status ${res.status}`;
        setLastRunSummary(s => ({ ...s, [pipeline.id]: `Failed: ${msg}` }));
        setRunMessage({ tone: 'error', text: msg });
        log('error', 'Pipeline run failed', `${pipeline.name}: ${msg}`);
        return;
      }

      const stepCount = data.steps?.length ?? 0;
      const errorCount = (data.steps ?? []).reduce(
        (n, s) =>
          n +
          (Array.isArray(s.errors) ? (s.errors as unknown[]).length : 0),
        0,
      );
      const stopped = data.stopped ? ' (stopped early)' : '';
      const summary =
        data.message && stepCount === 0
          ? String(data.message)
          : `Ran ${stepCount} chain(s), ${errorCount} middleware error(s)${stopped}`;
      setLastRunSummary(s => ({ ...s, [pipeline.id]: summary }));
      setRunMessage({ tone: 'success', text: summary });
      log('success', 'Pipeline run finished', `${pipeline.name}: ${summary}`);
      if (data.reason) {
        setRunMessage({ tone: 'info', text: `${summary} — ${data.reason}` });
        log('warning', 'Pipeline stopped early', data.reason);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastRunSummary(s => ({ ...s, [pipeline.id]: `Failed: ${msg}` }));
      setRunMessage({ tone: 'error', text: `Pipeline run failed: ${msg}` });
      log('error', 'Pipeline run exception', `${pipeline.name}: ${msg}`);
      setLastRunDetail({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        ranAt: new Date().toLocaleString(),
        httpStatus: 0,
        payload: { ok: false, error: msg },
        rawJson: JSON.stringify({ error: msg }, null, 2),
      });
    } finally {
      setRunningPipelineId(null);
    }
  };

  const legacySteps =
    editingPipeline?.steps.filter(s => s.type !== 'middleware') ?? [];

  return (
    <PageShell
      title="Middleware pipelines"
      description="Run ordered middleware chains against a simulated HTTP request."
      actions={
        <Button onClick={startCreatePipeline}>
          <Plus size={16} /> Add pipeline
        </Button>
      }
    >
      <Card className="mb-6 max-w-3xl">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Simulated request
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          The pipeline runner builds a synthetic NextRequest with this method,
          path, and optional body so your middleware sees a realistic request.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Select
            id="sim-method"
            label="Method"
            value={simMethod}
            onChange={e => setSimMethod(e.target.value as HttpMethod)}
            options={METHOD_OPTIONS}
          />
          <div className="sm:col-span-2">
            <Input
              label="Path"
              id="sim-path"
              value={simPath}
              onChange={e => setSimPath(e.target.value)}
              placeholder="/preview"
            />
          </div>
        </div>
        {['POST', 'PUT', 'PATCH'].includes(simMethod) && (
          <Textarea
            className="mt-4"
            label="Body (optional)"
            id="sim-body"
            value={simBody}
            onChange={e => setSimBody(e.target.value)}
            placeholder='{"hello":"world"}'
            rows={3}
          />
        )}
      </Card>

      {runMessage && (
        <Card
          className={`mb-6 ${
            runMessage.tone === 'error'
              ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
              : runMessage.tone === 'success'
                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
                : 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {runMessage.text}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setRunMessage(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {editingPipeline && (
        <Card className="mb-6 max-w-4xl">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {project.pipelines.some(p => p.id === editingPipeline.id)
              ? 'Edit pipeline'
              : 'New pipeline'}
          </h2>
          {legacySteps.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              This pipeline has {legacySteps.length} non-middleware step(s) that
              are no longer executed. They will be removed when you save.
            </div>
          )}
          <div className="flex flex-col gap-6">
            <Input
              label="Pipeline name"
              value={editingPipeline.name}
              onChange={e =>
                setEditingPipeline({ ...editingPipeline, name: e.target.value })
              }
              placeholder="Auth check then logging"
            />
            <Textarea
              label="Description"
              value={editingPipeline.description || ''}
              onChange={e =>
                setEditingPipeline({
                  ...editingPipeline,
                  description: e.target.value,
                })
              }
              rows={2}
            />

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Middleware chains
                </h3>
                <Button variant="secondary" size="sm" onClick={addMiddlewareStep}>
                  <Plus size={14} /> Add chain
                </Button>
              </div>

              <div className="space-y-4">
                {editingPipeline.steps.map((step, idx) => {
                  if (step.type !== 'middleware') {
                    return (
                      <div
                        key={step.id}
                        className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-amber-900 dark:text-amber-100">
                            Legacy step ({step.type}): {step.name} — not executed.
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const steps = editingPipeline.steps.filter(
                                (_, i) => i !== idx,
                              );
                              setEditingPipeline({ ...editingPipeline, steps });
                            }}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={step.id}
                      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Input
                          label="Chain name"
                          value={step.name}
                          onChange={e => {
                            const steps = editingPipeline.steps.map((s, i) =>
                              i === idx ? { ...s, name: e.target.value } : s,
                            );
                            setEditingPipeline({ ...editingPipeline, steps });
                          }}
                          className="max-w-md py-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const steps = editingPipeline.steps.filter(
                              (_, i) => i !== idx,
                            );
                            setEditingPipeline({ ...editingPipeline, steps });
                          }}
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Middlewares (run in listed order)
                      </label>
                      <div className="max-h-40 overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                        {project.middlewares.length === 0 ? (
                          <p className="text-xs text-zinc-500">
                            No middlewares in this project. Add some under
                            Middlewares first.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {project.middlewares.map(mw => {
                              const selected = (
                                (step.config?.middlewareIds as
                                  | string[]
                                  | undefined) ?? []
                              ).includes(mw.id);
                              return (
                                <label
                                  key={mw.id}
                                  className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    disabled={!mw.enabled}
                                    onChange={e => {
                                      const current =
                                        (step.config?.middlewareIds as
                                          | string[]
                                          | undefined) ?? [];
                                      const next = e.target.checked
                                        ? [...new Set([...current, mw.id])]
                                        : current.filter(id => id !== mw.id);
                                      const steps = editingPipeline.steps.map(
                                        (s, i) =>
                                          i === idx
                                            ? {
                                                ...s,
                                                config: {
                                                  ...s.config,
                                                  middlewareIds: next,
                                                },
                                              }
                                            : s,
                                      );
                                      setEditingPipeline({
                                        ...editingPipeline,
                                        steps,
                                      });
                                    }}
                                  />
                                  <span>
                                    {mw.name}
                                    {!mw.enabled ? ' (disabled)' : ''}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={savePipeline}
                disabled={!editingPipeline.name.trim()}
              >
                Save pipeline
              </Button>
              <Button variant="secondary" onClick={() => setEditingPipeline(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!editingPipeline &&
        (project.pipelines.length === 0 ? (
          <EmptyState
            icon={<Workflow size={48} />}
            title="No middleware pipelines"
            description="Create a pipeline, add one or more middleware chains, then run against the simulated request above."
            action={
              <Button onClick={startCreatePipeline}>
                <Plus size={16} /> Add pipeline
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.pipelines.map(pl => {
              const chains = countMiddlewareChains(pl.steps);
              const legacy = pl.steps.length - chains;
              return (
                <Card key={pl.id}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">
                      {pl.name}
                    </h3>
                    <Badge>
                      {chains} chain{chains === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  {legacy > 0 && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      {legacy} legacy step(s) ignored at run
                    </p>
                  )}
                  <p className="mt-1 text-sm text-zinc-500">{pl.description}</p>
                  {lastRunSummary[pl.id] && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {lastRunSummary[pl.id]}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pl.steps.map(step => {
                      if (step.type !== 'middleware') return null;
                      const ids =
                        (step.config?.middlewareIds as string[] | undefined) ??
                        [];
                      if (ids.length === 0) return null;
                      return ids.map(id => (
                        <Badge key={`${step.id}-${id}`} variant="default">
                          {middlewareNameById.get(id) ?? 'Middleware'}
                        </Badge>
                      ));
                    })}
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <Button variant="ghost" size="sm" onClick={() => setEditingPipeline(pl)}>
                      <Edit2 size={14} className="mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runPipelineNow(pl)}
                      disabled={runningPipelineId === pl.id}
                    >
                      <Play size={14} className="mr-1 text-green-500" /> Run
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        deletePipeline(pl.id);
                        log('warning', 'Pipeline deleted', pl.name);
                      }}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      {lastRunDetail && (
        <div className="mt-8">
          <PipelineRunResultPanel
            pipelineName={lastRunDetail.pipelineName}
            ranAt={lastRunDetail.ranAt}
            httpStatus={lastRunDetail.httpStatus}
            payload={lastRunDetail.payload}
            rawJson={lastRunDetail.rawJson}
            onClear={() => setLastRunDetail(null)}
          />
        </div>
      )}
    </PageShell>
  );
}

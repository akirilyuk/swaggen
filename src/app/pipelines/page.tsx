'use client';

import { Bot, Plus, Trash2, Edit2, Play, Workflow } from 'lucide-react';
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
import type {
  Pipeline,
  PipelineStep,
  PipelineStepType,
  Bot as BotType,
} from '@/types/project';

const STEP_TYPES: { value: PipelineStepType; label: string }[] = [
  { value: 'bot', label: 'Run Bot' },
  { value: 'middleware', label: 'Run Middleware Chain' },
  { value: 'transform', label: 'Transform Data' },
  { value: 'script', label: 'Custom Script' },
  { value: 'filter', label: 'Filter Data' },
];

const BOT_TYPES = [
  { value: 'openai-gpt-4', label: 'OpenAI GPT-4' },
  { value: 'openai-gpt-3.5', label: 'OpenAI GPT-3.5' },
  { value: 'anthropic-claude-3', label: 'Anthropic Claude 3' },
  { value: 'custom-ollama', label: 'Custom (Ollama)' },
];

export default function PipelinesPage() {
  return <PipelinesPageInner />;
}

function PipelinesPageInner() {
  const project = useProjectStore(s => s.activeProject());
  const addPipeline = useProjectStore(s => s.addPipeline);
  const updatePipeline = useProjectStore(s => s.updatePipeline);
  const deletePipeline = useProjectStore(s => s.deletePipeline);
  const addBot = useProjectStore(s => s.addBot);
  const updateBot = useProjectStore(s => s.updateBot);
  const deleteBot = useProjectStore(s => s.deleteBot);

  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [editingBot, setEditingBot] = useState<BotType | null>(null);
  const [view, setView] = useState<'pipelines' | 'bots'>('pipelines');
  const [runningPipelineId, setRunningPipelineId] = useState<string | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<Record<string, string>>({});
  const [runMessage, setRunMessage] = useState<{
    tone: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const { log } = useActionLog();

  useEffect(() => {
    log('info', 'Pipelines page opened');
  }, [log]);

  if (!project) {
    return (
      <PageShell title="Data Pipelines">
        <EmptyState
          icon={<Workflow size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

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
    if (exists) updatePipeline(editingPipeline);
    else addPipeline(editingPipeline);
    log(
      'success',
      exists ? 'Pipeline updated' : 'Pipeline created',
      editingPipeline.name,
    );
    setEditingPipeline(null);
  };

  const middlewareNameById = new Map(
    project.middlewares.map(mw => [mw.id, mw.name] as const),
  );

  const addStep = () => {
    if (!editingPipeline) return;
    const newStep: PipelineStep = {
      id: uuidV4(),
      type: 'bot',
      name: 'New Step',
      botId: project.bots[0]?.id || undefined,
      config: {},
      order: editingPipeline.steps.length,
    };
    setEditingPipeline({
      ...editingPipeline,
      steps: [...editingPipeline.steps, newStep],
    });
  };

  const startCreateBot = () => {
    log('info', 'Bot create started');
    setEditingBot({
      id: uuidV4(),
      name: '',
      description: '',
      type: 'openai-gpt-4',
      instructions: '',
      config: {},
    });
  };

  const saveBot = () => {
    if (!editingBot || !editingBot.name.trim()) return;
    const exists = project.bots.some(b => b.id === editingBot.id);
    if (exists) updateBot(editingBot);
    else addBot(editingBot);
    log('success', exists ? 'Bot updated' : 'Bot created', editingBot.name);
    setEditingBot(null);
  };

  const runPipelineNow = async (pipeline: Pipeline) => {
    setRunningPipelineId(pipeline.id);
    log('info', 'Pipeline run started', pipeline.name);
    try {
      const res = await fetch('/api/pipelines/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline,
          middlewares: project.middlewares,
          method: 'GET',
          path: '/preview',
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        stopped?: boolean;
        steps?: Array<{ errors?: string[] }>;
        reason?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        const msg = data.error || `Run failed with status ${res.status}`;
        setLastRunSummary(s => ({ ...s, [pipeline.id]: `Failed: ${msg}` }));
        setRunMessage({ tone: 'error', text: msg });
        log('error', 'Pipeline run failed', `${pipeline.name}: ${msg}`);
        return;
      }

      const stepCount = data.steps?.length ?? 0;
      const errorCount = (data.steps ?? []).reduce(
        (n, s) => n + (s.errors?.length ?? 0),
        0,
      );
      const stopped = data.stopped ? ' (stopped early)' : '';
      const summary = `Ran ${stepCount} step(s), ${errorCount} error(s)${stopped}`;
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
    } finally {
      setRunningPipelineId(null);
    }
  };

  return (
    <PageShell
      title="Pipelines & Bots"
      description="Create custom data processing pipelines and configure AI bots."
      actions={
        <div className="flex gap-2">
          <Button
            variant={view === 'pipelines' ? 'primary' : 'secondary'}
            onClick={() => setView('pipelines')}
          >
            Pipelines
          </Button>
          <Button
            variant={view === 'bots' ? 'primary' : 'secondary'}
            onClick={() => setView('bots')}
          >
            Bots
          </Button>
          <Button onClick={view === 'pipelines' ? startCreatePipeline : startCreateBot}>
            <Plus size={16} /> Add {view === 'pipelines' ? 'Pipeline' : 'Bot'}
          </Button>
        </div>
      }
    >
      {runMessage && (
        <Card
          className={
            runMessage.tone === 'error'
              ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
              : runMessage.tone === 'success'
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
              : 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
          }
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{runMessage.text}</p>
            <Button variant="ghost" size="sm" onClick={() => setRunMessage(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Bot Editor Overlay */}
      {editingBot && (
        <Card className="max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {project.bots.some(b => b.id === editingBot.id) ? 'Edit Bot' : 'New Bot'}
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Bot Name"
              value={editingBot.name}
              onChange={e => setEditingBot({ ...editingBot, name: e.target.value })}
              placeholder="Content Summary Bot"
            />
            <Select
              label="Bot Type / Model"
              value={editingBot.type}
              onChange={e => setEditingBot({ ...editingBot, type: e.target.value })}
              options={BOT_TYPES}
            />
            <Textarea
              label="System Instructions"
              value={editingBot.instructions || ''}
              onChange={e => setEditingBot({ ...editingBot, instructions: e.target.value })}
              placeholder="You are a helpful assistant that summarizes..."
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={saveBot} disabled={!editingBot.name.trim()}>Save Bot</Button>
              <Button variant="secondary" onClick={() => setEditingBot(null)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline Editor Overlay */}
      {editingPipeline && (
        <Card className="max-w-4xl">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {project.pipelines.some(p => p.id === editingPipeline.id) ? 'Edit Pipeline' : 'New Pipeline'}
          </h2>
          <div className="flex flex-col gap-6">
            <Input
              label="Pipeline Name"
              value={editingPipeline.name}
              onChange={e => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
              placeholder="Daily Data Cleanup"
            />
            <Textarea
              label="Description"
              value={editingPipeline.description || ''}
              onChange={e => setEditingPipeline({ ...editingPipeline, description: e.target.value })}
              rows={2}
            />

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Steps</h3>
                <Button variant="secondary" size="sm" onClick={addStep}>
                  <Plus size={14} /> Add Step
                </Button>
              </div>

              <div className="space-y-4">
                {editingPipeline.steps.map((step, idx) => (
                  <div key={step.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <div className="mb-3 flex items-center justify-between">
                      <Input
                        value={step.name}
                        onChange={e => {
                          const steps = editingPipeline.steps.map((s, i) => i === idx ? { ...s, name: e.target.value } : s);
                          setEditingPipeline({ ...editingPipeline, steps });
                        }}
                        className="w-64 py-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => {
                        const steps = editingPipeline.steps.filter((_, i) => i !== idx);
                        setEditingPipeline({ ...editingPipeline, steps });
                      }}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Step Type"
                        value={step.type}
                        onChange={e => {
                          const steps = editingPipeline.steps.map((s, i) => i === idx ? { ...s, type: e.target.value as PipelineStepType } : s);
                          setEditingPipeline({ ...editingPipeline, steps });
                        }}
                        options={STEP_TYPES}
                      />
                      {step.type === 'bot' && (
                        <Select
                          label="Select Bot"
                          value={step.botId || ''}
                          onChange={e => {
                            const steps = editingPipeline.steps.map((s, i) => i === idx ? { ...s, botId: e.target.value } : s);
                            setEditingPipeline({ ...editingPipeline, steps });
                          }}
                          options={[
                            { value: '', label: 'Select a bot...' },
                            ...project.bots.map(b => ({ value: b.id, label: b.name }))
                          ]}
                        />
                      )}
                      {step.type === 'middleware' && (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Middlewares
                          </label>
                          <div className="max-h-32 overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                            {project.middlewares.length === 0 ? (
                              <p className="text-xs text-zinc-500">
                                No middlewares available in this project.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {project.middlewares.map(mw => {
                                  const selected = (
                                    (step.config?.middlewareIds as string[] | undefined) ?? []
                                  ).includes(mw.id);
                                  return (
                                    <label
                                      key={mw.id}
                                      className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={e => {
                                          const current =
                                            (step.config?.middlewareIds as
                                              | string[]
                                              | undefined) ?? [];
                                          const next = e.target.checked
                                            ? [...new Set([...current, mw.id])]
                                            : current.filter(id => id !== mw.id);
                                          const steps = editingPipeline.steps.map((s, i) =>
                                            i === idx
                                              ? {
                                                  ...s,
                                                  config: { ...s.config, middlewareIds: next },
                                                }
                                              : s,
                                          );
                                          setEditingPipeline({ ...editingPipeline, steps });
                                        }}
                                      />
                                      <span>{mw.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {(step.type === 'script' || step.type === 'transform') && (
                      <div className="mt-3">
                        <Textarea
                          label="Code / Script"
                          value={step.code || ''}
                          onChange={e => {
                            const steps = editingPipeline.steps.map((s, i) => i === idx ? { ...s, code: e.target.value } : s);
                            setEditingPipeline({ ...editingPipeline, steps });
                          }}
                          rows={3}
                          className="font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={savePipeline} disabled={!editingPipeline.name.trim()}>Save Pipeline</Button>
              <Button variant="secondary" onClick={() => setEditingPipeline(null)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main List View */}
      {!editingPipeline && !editingBot && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {view === 'pipelines' ? (
            project.pipelines.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<Workflow size={48} />}
                  title="No pipelines created"
                  description="Create a data pipeline to automate your tasks."
                  action={<Button onClick={startCreatePipeline}><Plus size={16} /> Add Pipeline</Button>}
                />
              </div>
            ) : (
              project.pipelines.map(pl => (
                <Card key={pl.id}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{pl.name}</h3>
                    <Badge>{pl.steps.length} steps</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{pl.description}</p>
                  {lastRunSummary[pl.id] && (
                    <p className="mt-1 text-xs text-zinc-500">{lastRunSummary[pl.id]}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pl.steps.map(step => {
                      if (step.type !== 'middleware') return null;
                      const ids = (step.config?.middlewareIds as string[] | undefined) ?? [];
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
              ))
            )
          ) : (
            project.bots.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<Bot size={48} />}
                  title="No bots configured"
                  description="Add an AI bot to use in your pipelines."
                  action={<Button onClick={startCreateBot}><Plus size={16} /> Add Bot</Button>}
                />
              </div>
            ) : (
              project.bots.map(bot => (
                <Card key={bot.id}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{bot.name}</h3>
                    <Badge variant="success">{bot.type}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{bot.instructions}</p>
                  <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <Button variant="ghost" size="sm" onClick={() => setEditingBot(bot)}>
                      <Edit2 size={14} className="mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        deleteBot(bot.id);
                        log('warning', 'Bot deleted', bot.name);
                      }}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                </Card>
              ))
            )
          )}
        </div>
      )}
    </PageShell>
  );
}

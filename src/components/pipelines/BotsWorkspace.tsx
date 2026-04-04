'use client';

import { Bot, Plus, Trash2, Edit2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
  botHasStoredApiKey,
  botTypeExpectsApiKey,
  mergeBotProviderIntoConfig,
  readBotBaseUrl,
  readBotOrganizationId,
} from '@/lib/botProviderSettings';
import { useProjectStore } from '@/store/projectStore';
import type { Bot as BotType } from '@/types/project';

import { BotTesterPanel } from './BotTesterPanel';

const BOT_TYPES = [
  { value: 'openai-gpt-4', label: 'OpenAI GPT-5.4 (frontier)' },
  { value: 'openai-gpt-3.5', label: 'OpenAI GPT-5.4 mini' },
  { value: 'anthropic-claude-3', label: 'Anthropic Claude Sonnet 4.6' },
  { value: 'custom-ollama', label: 'Custom (Ollama)' },
];

export function BotsWorkspace() {
  const project = useProjectStore(s => s.activeProject());
  const addBot = useProjectStore(s => s.addBot);
  const updateBot = useProjectStore(s => s.updateBot);
  const deleteBot = useProjectStore(s => s.deleteBot);

  const [editingBot, setEditingBot] = useState<BotType | null>(null);
  const [botApiKeyDraft, setBotApiKeyDraft] = useState('');
  const [botRemoveApiKey, setBotRemoveApiKey] = useState(false);
  const [botBaseUrlDraft, setBotBaseUrlDraft] = useState('');
  const [botOrgDraft, setBotOrgDraft] = useState('');
  const { log } = useActionLog();

  useEffect(() => {
    log('info', 'Bots page opened');
  }, [log]);

  useEffect(() => {
    if (!editingBot) return;
    setBotApiKeyDraft('');
    setBotRemoveApiKey(false);
    setBotBaseUrlDraft(readBotBaseUrl(editingBot.config) ?? '');
    setBotOrgDraft(readBotOrganizationId(editingBot.config) ?? '');
  }, [editingBot?.id]);

  const editingPreviewBot = useMemo(() => {
    if (!editingBot) return null;
    const exists = project?.bots.some(b => b.id === editingBot.id) ?? false;
    const config = mergeBotProviderIntoConfig(editingBot.config, {
      apiKeyDraft: botApiKeyDraft,
      removeApiKey: botRemoveApiKey,
      isNewBot: !exists,
      baseUrlDraft: botBaseUrlDraft,
      organizationIdDraft: botOrgDraft,
    });
    return { ...editingBot, config };
  }, [
    editingBot,
    project?.bots,
    botApiKeyDraft,
    botRemoveApiKey,
    botBaseUrlDraft,
    botOrgDraft,
  ]);

  if (!project) {
    return (
      <PageShell title="Bots">
        <EmptyState
          icon={<Bot size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

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
    const config = mergeBotProviderIntoConfig(editingBot.config, {
      apiKeyDraft: botApiKeyDraft,
      removeApiKey: botRemoveApiKey,
      isNewBot: !exists,
      baseUrlDraft: botBaseUrlDraft,
      organizationIdDraft: botOrgDraft,
    });
    const saved: BotType = { ...editingBot, config };
    if (exists) updateBot(saved);
    else addBot(saved);
    log('success', exists ? 'Bot updated' : 'Bot created', editingBot.name);
    setEditingBot(null);
  };

  return (
    <PageShell
      title="Bots"
      description="AI model profiles, credentials, and a Try a bot panel to ping your provider."
      actions={
        <Button onClick={startCreateBot}>
          <Plus size={16} /> Add Bot
        </Button>
      }
    >
      {project.bots.length > 0 && !editingBot && (
        <BotTesterPanel bots={project.bots} projectName={project.name} />
      )}

      {editingBot && (
        <Card className="mb-6 max-w-2xl">
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
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Provider credentials
              </h3>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                Saved on this bot&apos;s config in your project database. Keys are
                not shown again after save — leave the field blank to keep the
                current secret, or use &quot;Remove stored API key&quot; to clear
                it.
              </p>
              <div className="flex flex-col gap-4">
                <Input
                  label="API key"
                  id="bot-api-key"
                  type="password"
                  autoComplete="new-password"
                  value={botApiKeyDraft}
                  onChange={e => setBotApiKeyDraft(e.target.value)}
                  placeholder={
                    project.bots.some(b => b.id === editingBot.id) &&
                    botHasStoredApiKey(editingBot)
                      ? 'Leave blank to keep current key'
                      : 'Provider secret (e.g. sk-…)'
                  }
                />
                {project.bots.some(b => b.id === editingBot.id) &&
                  botHasStoredApiKey(editingBot) && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={botRemoveApiKey}
                        onChange={e => setBotRemoveApiKey(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-600"
                      />
                      Remove stored API key
                    </label>
                  )}
                <Input
                  label="Base URL (optional)"
                  id="bot-base-url"
                  value={botBaseUrlDraft}
                  onChange={e => setBotBaseUrlDraft(e.target.value)}
                  placeholder="Ollama: http://localhost:11434/v1 — or proxy / Azure endpoint"
                />
                <Input
                  label="Organization ID (optional)"
                  id="bot-org-id"
                  value={botOrgDraft}
                  onChange={e => setBotOrgDraft(e.target.value)}
                  placeholder="OpenAI organization id when required"
                />
                {editingBot.type === 'custom-ollama' && (
                  <Input
                    label="Ollama model name"
                    id="bot-ollama-model"
                    value={
                      typeof editingBot.config.ollamaModel === 'string'
                        ? editingBot.config.ollamaModel
                        : ''
                    }
                    onChange={e =>
                      setEditingBot({
                        ...editingBot,
                        config: {
                          ...editingBot.config,
                          ollamaModel: e.target.value,
                        },
                      })
                    }
                    placeholder="llama3.2"
                  />
                )}
                {editingBot.type.startsWith('openai') && (
                  <Input
                    label="OpenAI model id (optional override)"
                    id="bot-openai-model"
                    value={
                      typeof editingBot.config.openaiModel === 'string'
                        ? editingBot.config.openaiModel
                        : ''
                    }
                    onChange={e =>
                      setEditingBot({
                        ...editingBot,
                        config: {
                          ...editingBot.config,
                          openaiModel: e.target.value,
                        },
                      })
                    }
                    placeholder="gpt-5.4 or gpt-5.4-mini (defaults from preset)"
                  />
                )}
                {editingBot.type === 'anthropic-claude-3' && (
                  <Input
                    label="Anthropic model id (optional override)"
                    id="bot-anthropic-model"
                    value={
                      typeof editingBot.config.anthropicModel === 'string'
                        ? editingBot.config.anthropicModel
                        : ''
                    }
                    onChange={e =>
                      setEditingBot({
                        ...editingBot,
                        config: {
                          ...editingBot.config,
                          anthropicModel: e.target.value,
                        },
                      })
                    }
                    placeholder="claude-sonnet-4-6 (default)"
                  />
                )}
              </div>
            </div>
            <Textarea
              label="System Instructions"
              value={editingBot.instructions || ''}
              onChange={e =>
                setEditingBot({ ...editingBot, instructions: e.target.value })
              }
              placeholder="You are a helpful assistant that summarizes..."
              rows={4}
            />
            {editingPreviewBot && (
              <BotTesterPanel
                embedded
                bots={project.bots}
                projectName={project.name}
                previewBot={editingPreviewBot}
              />
            )}
            <div className="flex gap-2">
              <Button onClick={saveBot} disabled={!editingBot.name.trim()}>
                Save Bot
              </Button>
              <Button variant="secondary" onClick={() => setEditingBot(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!editingBot &&
        (project.bots.length === 0 ? (
          <EmptyState
            icon={<Bot size={48} />}
            title="No bots configured"
            description="Add a bot and provider credentials for models you call from your own code or future automations."
            action={
              <Button onClick={startCreateBot}>
                <Plus size={16} /> Add Bot
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.bots.map(bot => (
              <Card key={bot.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {bot.name}
                  </h3>
                  <Badge variant="success">{bot.type}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {botHasStoredApiKey(bot) ? (
                    <Badge variant="success">API key on file</Badge>
                  ) : botTypeExpectsApiKey(bot.type) ? (
                    <Badge>API key missing</Badge>
                  ) : null}
                  {readBotBaseUrl(bot.config) ? (
                    <Badge variant="default">Custom base URL</Badge>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                  {bot.instructions}
                </p>
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
            ))}
          </div>
        ))}
    </PageShell>
  );
}

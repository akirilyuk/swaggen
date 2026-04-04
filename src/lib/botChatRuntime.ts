import type { Bot } from '@/types/project';

import {
  readBotApiKey,
  readBotBaseUrl,
  readBotOrganizationId,
  botTypeExpectsApiKey,
} from '@/lib/botProviderSettings';
import {
  SWAGGEN_PROJECT_ID_HEADER,
  SWAGGEN_USER_ID_HEADER,
} from '@/lib/swaggenRequestMeta';

/** Optional Swaggen context forwarded to provider HTTP calls where supported. */
export type BotChatRunMeta = {
  projectId?: string | null;
  userId?: string | null;
};

function upstreamMetaHeaders(meta?: BotChatRunMeta): Record<string, string> {
  const h: Record<string, string> = {};
  if (meta?.projectId && String(meta.projectId).trim()) {
    h[SWAGGEN_PROJECT_ID_HEADER] = String(meta.projectId).trim();
  }
  if (meta?.userId && String(meta.userId).trim()) {
    h[SWAGGEN_USER_ID_HEADER] = String(meta.userId).trim();
  }
  return h;
}

export type BotChatSuccess = {
  ok: true;
  text: string;
  provider: 'openai' | 'anthropic' | 'ollama';
};

export type BotChatFailure = {
  ok: false;
  error: string;
  upstreamStatus?: number;
};

export type BotChatResult = BotChatSuccess | BotChatFailure;

/**
 * Default API model ids for each bot preset. Kept in sync with provider docs;
 * use `bot.config.openaiModel` / `anthropicModel` to override per bot.
 *
 * OpenAI Chat Completions: https://platform.openai.com/docs/models
 * Anthropic Messages: https://docs.anthropic.com/en/docs/about-claude/models
 */
const OPENAI_MODEL_BY_PRESET: Record<string, string> = {
  /** Frontier default (Chat Completions `v1/chat/completions`) */
  'openai-gpt-4': 'gpt-5.4',
  /** Lower-latency / cost default */
  'openai-gpt-3.5': 'gpt-5.4-mini',
};

const ANTHROPIC_MODEL_BY_PRESET: Record<string, string> = {
  /** Current-gen Sonnet alias (replaces retired Claude 3.5 snapshot ids) */
  'anthropic-claude-3': 'claude-sonnet-4-6',
};

function strConfig(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = config[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function resolveOpenAIModel(bot: Bot): string | null {
  const override = strConfig(bot.config, 'openaiModel');
  if (override) return override;
  return OPENAI_MODEL_BY_PRESET[bot.type] ?? null;
}

function resolveAnthropicModel(bot: Bot): string | null {
  const override = strConfig(bot.config, 'anthropicModel');
  if (override) return override;
  return ANTHROPIC_MODEL_BY_PRESET[bot.type] ?? null;
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const t = await res.text();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return { raw: t };
  }
}

/** Calls the configured provider for a single user turn (non-streaming). */
export async function runBotChat(
  bot: Bot,
  userMessage: string,
  runMeta?: BotChatRunMeta,
): Promise<BotChatResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { ok: false, error: 'Message is empty.' };
  }

  const apiKey = readBotApiKey(bot.config);
  const baseUrl = readBotBaseUrl(bot.config);
  const organizationId = readBotOrganizationId(bot.config);
  const instructions = bot.instructions?.trim() || undefined;

  if (botTypeExpectsApiKey(bot.type) && !apiKey) {
    return {
      ok: false,
      error:
        'This bot type needs an API key. Edit the bot and add credentials first.',
    };
  }

  const openaiModel = resolveOpenAIModel(bot);
  if (openaiModel) {
    return callOpenAI({
      model: openaiModel,
      apiKey: apiKey!,
      baseUrl: baseUrl ?? 'https://api.openai.com/v1',
      organizationId,
      instructions,
      userMessage: trimmed,
      runMeta,
    });
  }

  const anthropicModel = resolveAnthropicModel(bot);
  if (anthropicModel) {
    if (!apiKey) {
      return { ok: false, error: 'Anthropic requires an API key.' };
    }
    return callAnthropic({
      model: anthropicModel,
      apiKey,
      instructions,
      userMessage: trimmed,
      runMeta,
    });
  }

  if (bot.type === 'custom-ollama') {
    const root = (baseUrl ?? 'http://localhost:11434/v1').replace(/\/$/, '');
    const model =
      typeof bot.config.ollamaModel === 'string' &&
      bot.config.ollamaModel.trim()
        ? bot.config.ollamaModel.trim()
        : 'llama3.2';
    return callOllamaOpenAICompatible({
      baseUrl: root,
      apiKey,
      model,
      instructions,
      userMessage: trimmed,
      runMeta,
    });
  }

  return {
    ok: false,
    error: `Unsupported bot type "${bot.type}" for chat test.`,
  };
}

async function callOpenAI(args: {
  model: string;
  apiKey: string;
  baseUrl: string;
  organizationId?: string;
  instructions?: string;
  userMessage: string;
  runMeta?: BotChatRunMeta;
}): Promise<BotChatResult> {
  const url = `${args.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const messages: Array<{ role: string; content: string }> = [];
  if (args.instructions) {
    messages.push({ role: 'system', content: args.instructions });
  }
  messages.push({ role: 'user', content: args.userMessage });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${args.apiKey}`,
        ...(args.organizationId
          ? { 'OpenAI-Organization': args.organizationId }
          : {}),
        ...upstreamMetaHeaders(args.runMeta),
      },
      body: JSON.stringify({
        model: args.model,
        messages,
        ...(args.runMeta?.userId && String(args.runMeta.userId).trim()
          ? { user: String(args.runMeta.userId).trim() }
          : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `OpenAI request failed: ${msg}` };
  }

  const data = (await readJsonSafe(res)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err =
      (data?.error as { message?: string } | undefined)?.message ??
      (typeof data?.error === 'string' ? data.error : null) ??
      res.statusText;
    return {
      ok: false,
      error: `OpenAI error (${res.status}): ${err}`,
      upstreamStatus: res.status,
    };
  }

  const choice = (data?.choices as Array<{ message?: { content?: string } }> | undefined)?.[0];
  const text = choice?.message?.content?.trim();
  if (!text) {
    return { ok: false, error: 'OpenAI returned an empty reply.' };
  }
  return { ok: true, text, provider: 'openai' };
}

async function callAnthropic(args: {
  model: string;
  apiKey: string;
  instructions?: string;
  userMessage: string;
  runMeta?: BotChatRunMeta;
}): Promise<BotChatResult> {
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': args.apiKey,
        'anthropic-version': '2023-06-01',
        ...upstreamMetaHeaders(args.runMeta),
      },
      body: JSON.stringify({
        model: args.model,
        max_tokens: 4096,
        ...(args.instructions ? { system: args.instructions } : {}),
        messages: [{ role: 'user', content: args.userMessage }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Anthropic request failed: ${msg}` };
  }

  const data = (await readJsonSafe(res)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err =
      (data?.error as { message?: string } | undefined)?.message ??
      res.statusText;
    return {
      ok: false,
      error: `Anthropic error (${res.status}): ${err}`,
      upstreamStatus: res.status,
    };
  }

  const blocks = data?.content as Array<{ type?: string; text?: string }> | undefined;
  const text = blocks?.find(b => b.type === 'text')?.text?.trim();
  if (!text) {
    return { ok: false, error: 'Anthropic returned an empty reply.' };
  }
  return { ok: true, text, provider: 'anthropic' };
}

async function callOllamaOpenAICompatible(args: {
  baseUrl: string;
  apiKey?: string;
  model: string;
  instructions?: string;
  userMessage: string;
  runMeta?: BotChatRunMeta;
}): Promise<BotChatResult> {
  const url = `${args.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const messages: Array<{ role: string; content: string }> = [];
  if (args.instructions) {
    messages.push({ role: 'system', content: args.instructions });
  }
  messages.push({ role: 'user', content: args.userMessage });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(args.apiKey ? { Authorization: `Bearer ${args.apiKey}` } : {}),
        ...upstreamMetaHeaders(args.runMeta),
      },
      body: JSON.stringify({
        model: args.model,
        messages,
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Ollama request failed: ${msg}. Is the server running at ${args.baseUrl}?`,
    };
  }

  const data = (await readJsonSafe(res)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err =
      (data?.error as { message?: string } | undefined)?.message ??
      (typeof data?.error === 'string' ? data.error : null) ??
      res.statusText;
    return {
      ok: false,
      error: `Ollama error (${res.status}): ${err}`,
      upstreamStatus: res.status,
    };
  }

  const choice = (data?.choices as Array<{ message?: { content?: string } }> | undefined)?.[0];
  const text = choice?.message?.content?.trim();
  if (!text) {
    return { ok: false, error: 'Ollama returned an empty reply.' };
  }
  return { ok: true, text, provider: 'ollama' };
}

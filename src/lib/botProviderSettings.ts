import type { Bot } from '@/types/project';

function str(config: Record<string, unknown>, key: string): string | undefined {
  const v = config[key];
  return typeof v === 'string' ? v : undefined;
}

export function readBotApiKey(config: Record<string, unknown>): string | undefined {
  const k = str(config, 'apiKey');
  return k && k.trim() ? k : undefined;
}

export function readBotBaseUrl(config: Record<string, unknown>): string | undefined {
  const u = str(config, 'baseUrl');
  return u && u.trim() ? u : undefined;
}

export function readBotOrganizationId(
  config: Record<string, unknown>,
): string | undefined {
  const o = str(config, 'organizationId');
  return o && o.trim() ? o : undefined;
}

export function botHasStoredApiKey(bot: Bot): boolean {
  return !!readBotApiKey(bot.config);
}

/** Cloud providers that normally require an API key (Ollama is usually base URL only). */
export function botTypeExpectsApiKey(type: string): boolean {
  return type.startsWith('openai') || type.startsWith('anthropic');
}

/**
 * Merges provider fields into `bot.config`.
 * Empty API key draft on an existing bot leaves the previous key unchanged.
 */
export function mergeBotProviderIntoConfig(
  existingConfig: Record<string, unknown>,
  input: {
    apiKeyDraft: string;
    removeApiKey: boolean;
    isNewBot: boolean;
    baseUrlDraft: string;
    organizationIdDraft: string;
  },
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existingConfig };
  const keyDraft = input.apiKeyDraft.trim();

  if (keyDraft) {
    out.apiKey = keyDraft;
  } else if (input.removeApiKey) {
    delete out.apiKey;
  } else if (input.isNewBot) {
    delete out.apiKey;
  }

  const bu = input.baseUrlDraft.trim();
  if (bu) out.baseUrl = bu;
  else delete out.baseUrl;

  const org = input.organizationIdDraft.trim();
  if (org) out.organizationId = org;
  else delete out.organizationId;

  return out;
}

import { runBotChat } from '@/lib/botChatRuntime';
import type { Bot } from '@/types/project';

describe('runBotChat', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects empty user message', async () => {
    const bot: Bot = {
      id: '1',
      name: 'x',
      type: 'openai-gpt-4',
      instructions: 'hi',
      config: { apiKey: 'sk-test' },
    };
    const r = await runBotChat(bot, '   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/i);
  });

  it('requires API key for OpenAI bots', async () => {
    const bot: Bot = {
      id: '1',
      name: 'x',
      type: 'openai-gpt-4',
      config: {},
    };
    const r = await runBotChat(bot, 'hello');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/API key/i);
  });

  it('parses OpenAI success response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: '  Hello back  ' } }],
        }),
    } as unknown as Response);

    const bot: Bot = {
      id: '1',
      name: 'x',
      type: 'openai-gpt-4',
      config: { apiKey: 'sk-test' },
    };
    const r = await runBotChat(bot, 'hello');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('Hello back');
      expect(r.provider).toBe('openai');
    }
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('gpt-5.4');
  });

  it('uses config.openaiModel when set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
        }),
    } as unknown as Response);

    const bot: Bot = {
      id: '1',
      name: 'x',
      type: 'openai-gpt-4',
      config: { apiKey: 'sk-test', openaiModel: 'gpt-4o-mini' },
    };
    await runBotChat(bot, 'hi');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o-mini');
  });
});

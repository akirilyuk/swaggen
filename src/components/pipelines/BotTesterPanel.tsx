'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, Card, Select, Textarea } from '@/components/ui';
import type { Bot } from '@/types/project';

import { botHasStoredApiKey, botTypeExpectsApiKey } from '@/lib/botProviderSettings';

type Props = {
  bots: Bot[];
};

const SNIPPET = `// Example: call from a Route Handler or Server Action
const res = await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/bots/chat\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bot: myBot,      // same shape as in the designer (includes config.apiKey)
    message: text,
  }),
});
const data = await res.json();
if (data.ok) console.log(data.text);
`;

const MW_SNIPPET = `// Example: forward from middleware (use absolute URL on your deployment)
export async function middleware(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const res = await fetch(new URL('/api/bots/chat', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bot: await loadBotFromYourStore(),
      message: typeof body?.prompt === 'string' ? body.prompt : '',
    }),
  });
  const data = await res.json();
  // use data.text or return NextResponse.json(data)
}`;

export function BotTesterPanel({ bots }: Props) {
  const [botId, setBotId] = useState(bots[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => bots.find(b => b.id === botId) ?? bots[0] ?? null,
    [bots, botId],
  );

  const options = useMemo(
    () => bots.map(b => ({ value: b.id, label: b.name || b.id })),
    [bots],
  );

  useEffect(() => {
    if (bots.length === 0) return;
    if (!bots.some(b => b.id === botId)) {
      setBotId(bots[0]!.id);
    }
  }, [bots, botId]);

  const send = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch('/api/bots/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot: selected, message }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        text?: string;
        error?: string;
      };
      if (!data.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      setReply(data.text ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (bots.length === 0) return null;

  const needsKey =
    selected &&
    botTypeExpectsApiKey(selected.type) &&
    !botHasStoredApiKey(selected);

  return (
    <Card className="mb-6 max-w-3xl border-blue-200/80 dark:border-blue-900/50">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Try a bot
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Sends one user message using the preset model id (or your optional
        override in the bot editor). If the API returns 404, your account may
        use different model names — set &quot;OpenAI model id&quot; or
        &quot;Anthropic model id&quot; to match the provider docs. For
        production, call{' '}
        <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
          POST /api/bots/chat
        </code>{' '}
        from server code or middleware instead of exposing keys in the browser.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <Select
          id="test-bot-select"
          label="Bot"
          value={selected?.id ?? botId}
          onChange={e => setBotId(e.target.value)}
          options={options}
        />
        {needsKey && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Add an API key in the bot editor before testing this provider.
          </p>
        )}
        <Textarea
          id="test-bot-message"
          label="Your message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ask something…"
          rows={4}
        />
        <div>
          <Button
            onClick={() => void send()}
            disabled={loading || !message.trim() || needsKey}
          >
            {loading ? 'Sending…' : 'Send test'}
          </Button>
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        )}
        {reply !== null && reply !== '' && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Assistant reply
            </p>
            <div className="max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm whitespace-pre-wrap text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              {reply}
            </div>
          </div>
        )}
      </div>

      <details className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Connect from routes or middleware
        </summary>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Use the same JSON body your browser sends:{' '}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            {'{ bot, message }'}
          </code>
          . Load the bot from your database or session; avoid hardcoding API keys
          in git — prefer env vars and merge into{' '}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            bot.config
          </code>{' '}
          on the server.
        </p>
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-200 dark:border-zinc-700">
          {SNIPPET}
        </pre>
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-200 dark:border-zinc-700">
          {MW_SNIPPET}
        </pre>
      </details>
    </Card>
  );
}

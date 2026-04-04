'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, Card, Select, Textarea } from '@/components/ui';
import type { Bot } from '@/types/project';

import { botHasStoredApiKey, botTypeExpectsApiKey } from '@/lib/botProviderSettings';
import { buildBotChatApiPath } from '@/lib/swaggenRequestMeta';
import { toSlug } from '@/lib/projectRegistry';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';

type Props = {
  bots: Bot[];
  /** Active project name — used with \`/site/{slug}\` for the published site URL. */
  projectName: string;
  /**
   * When set (e.g. bot editor draft), the tester targets this bot only and hides
   * the picker. Uses unsaved form state merged the same way as Save.
   */
  previewBot?: Bot | null;
  /** Render inside another surface (e.g. bot editor card) without an outer Card. */
  embedded?: boolean;
};

export function BotTesterPanel({
  bots,
  projectName,
  previewBot,
  embedded,
}: Props) {
  const activeProject = useProjectStore(s => s.activeProject());
  const user = useAuthStore(s => s.user);

  const [botId, setBotId] = useState(bots[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const [exampleOutcome, setExampleOutcome] = useState<{
    status: number;
    body: unknown;
  } | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(
      typeof window !== 'undefined' ? window.location.origin : '',
    );
  }, []);

  const projectSlug = useMemo(() => toSlug(projectName), [projectName]);

  /** Path segment for callers without a Supabase user — matches the API route. */
  const userPathSegment = user?.id?.trim() || '_';

  const chatPath = useMemo(() => {
    const pid = activeProject?.id?.trim();
    if (!pid) return null;
    return buildBotChatApiPath(pid, userPathSegment);
  }, [activeProject?.id, userPathSegment]);

  /** Same URL as in the route-handler snippet (absolute when we know `origin`). */
  const chatApiUrl = useMemo(
    () => (chatPath ? (origin ? `${origin}${chatPath}` : chatPath) : ''),
    [origin, chatPath],
  );

  const routeHandlerSnippet = useMemo(() => {
    const publishedSite = origin
      ? `${origin}/site/${projectSlug}`
      : `https://<your-host>/site/${projectSlug}`;
    const exampleFetchUrl =
      chatApiUrl ||
      (origin
        ? `${origin}/api/bots/<project-id>/_/chat`
        : `https://<your-host>/api/bots/<project-id>/_/chat`);
    return `// Same deployment as your published site:
//   ${publishedSite}
// Bot chat API: /api/bots/{projectId}/{userId}/chat — use "_" for userId when anonymous
const res = await fetch(\`${exampleFetchUrl}\`, {
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
  }, [origin, projectSlug, chatApiUrl]);

  const middlewareSnippet = useMemo(() => {
    const rel =
      activeProject?.id?.trim()
        ? buildBotChatApiPath(activeProject.id.trim(), userPathSegment)
        : '/api/bots/<project-id>/_/chat';
    return `// Example: forward from middleware (use absolute URL on your deployment)
export async function middleware(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const res = await fetch(new URL(\`${rel}\`, request.url), {
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
  }, [activeProject?.id, userPathSegment]);

  const selected = useMemo(() => {
    if (previewBot) return previewBot;
    return bots.find(b => b.id === botId) ?? bots[0] ?? null;
  }, [bots, botId, previewBot]);

  const options = useMemo(
    () => bots.map(b => ({ value: b.id, label: b.name || b.id })),
    [bots],
  );

  useEffect(() => {
    if (previewBot) return;
    if (bots.length === 0) return;
    if (!bots.some(b => b.id === botId)) {
      setBotId(bots[0]!.id);
    }
  }, [bots, botId, previewBot]);

  const parseResponseBody = async (res: Response): Promise<unknown> => {
    const t = await res.text();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return { raw: t };
    }
  };

  const postBotChat = async () => {
    if (!selected) throw new Error('No bot selected');
    if (!chatPath) throw new Error('No project id — select a project with an id.');
    const res = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot: selected, message }),
    });
    const body = await parseResponseBody(res);
    return { status: res.status, body };
  };

  const send = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setReply(null);
    try {
      const { status, body } = await postBotChat();
      const data = body as {
        ok?: boolean;
        text?: string;
        error?: string;
      };
      if (!data.ok) {
        setError(data.error || `Request failed (${status})`);
        return;
      }
      setReply(data.text ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const runExampleSnippet = async () => {
    if (!selected) return;
    setExampleLoading(true);
    setExampleError(null);
    setExampleOutcome(null);
    try {
      const outcome = await postBotChat();
      setExampleOutcome(outcome);
    } catch (e) {
      setExampleError(e instanceof Error ? e.message : String(e));
    } finally {
      setExampleLoading(false);
    }
  };

  if (bots.length === 0 && !previewBot) return null;

  const needsKey =
    selected &&
    botTypeExpectsApiKey(selected.type) &&
    !botHasStoredApiKey(selected);

  const messageFieldId = embedded ? 'test-bot-message-editor' : 'test-bot-message';

  const body = (
    <>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Try a bot
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {previewBot ? (
          <>
            Sends one message using the bot you are editing — including
            credentials and model fields you have not saved yet. Same request as{' '}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              POST{' '}
              {chatApiUrl ||
                '/api/bots/{projectId}/{userId}/chat (use _ if no user)'}
            </code>{' '}
            in the example below.
          </>
        ) : (
          <>
            Sends one user message using the preset model id (or your optional
            override in the bot editor). If the API returns 404, your account may
            use different model names — set &quot;OpenAI model id&quot; or
            &quot;Anthropic model id&quot; to match the provider docs. For
            production, call{' '}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              POST{' '}
              {chatApiUrl ||
                '/api/bots/{projectId}/{userId}/chat (use _ if no user)'}
            </code>{' '}
            from server code or middleware instead of exposing keys in the
            browser.
          </>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {previewBot ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-white">
              Bot:
            </span>{' '}
            {previewBot.name.trim() || '(unnamed)'}
          </p>
        ) : (
          <Select
            id="test-bot-select"
            label="Bot"
            value={selected?.id ?? botId}
            onChange={e => setBotId(e.target.value)}
            options={options}
          />
        )}
        {needsKey && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {previewBot
              ? 'Add an API key in the fields above before testing this provider.'
              : 'Add an API key in the bot editor before testing this provider.'}
          </p>
        )}
        <Textarea
          id={messageFieldId}
          label="Your message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ask something…"
          rows={4}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void send()}
            disabled={
              loading ||
              exampleLoading ||
              !message.trim() ||
              needsKey ||
              !chatPath
            }
          >
            {loading ? 'Sending…' : 'Send test'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void runExampleSnippet()}
            disabled={
              exampleLoading ||
              loading ||
              needsKey ||
              !selected ||
              !chatPath
            }
          >
            {exampleLoading ? 'Running…' : 'Run example code'}
          </Button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            Run example code
          </span>{' '}
          performs the same <code className="text-[10px]">POST</code> as the
          route-handler snippet (
          <code className="text-[10px]">{chatApiUrl}</code>
          ) with your current bot and message (message may be empty) and shows
          the raw <code className="text-[10px]">data</code> from{' '}
          <code className="text-[10px]">await res.json()</code>.
        </p>
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
        {exampleError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {exampleError}
          </p>
        )}
        {exampleOutcome !== null && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Example code result (<code className="font-mono">data</code>)
            </p>
            <p className="mb-1 text-[11px] text-zinc-500">
              HTTP {exampleOutcome.status}
            </p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-200 dark:border-zinc-700">
              {JSON.stringify(exampleOutcome.body, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <details className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Connect from routes or middleware
        </summary>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Published site for this project:{' '}
          <code className="rounded bg-zinc-200 px-1 text-[10px] dark:bg-zinc-800">
            {origin
              ? `${origin}/site/${projectSlug}`
              : `/site/${projectSlug}`}
          </code>
          . Bot chat endpoint:{' '}
          <code className="text-[10px]">POST /api/bots/&#123;projectId&#125;/&#123;userId&#125;/chat</code>{' '}
          — use <code className="text-[10px]">_</code> for{' '}
          <code className="text-[10px]">userId</code> when there is no signed-in
          user (see snippets). JSON body:{' '}
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
        <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-200 dark:border-zinc-700">
          {routeHandlerSnippet}
        </pre>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Use <strong className="font-medium text-zinc-600 dark:text-zinc-300">
            Run example code
          </strong>{' '}
          above with the same bot and message: it substitutes{' '}
          <code className="text-[10px]">myBot</code> and{' '}
          <code className="text-[10px]">text</code> and shows the JSON you get
          from <code className="text-[10px]">await res.json()</code>. The
          middleware sample below only runs on the server.
        </p>
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-200 dark:border-zinc-700">
          {middlewareSnippet}
        </pre>
      </details>
    </>
  );

  if (embedded) {
    return (
      <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
        {body}
      </div>
    );
  }

  return (
    <Card className="mb-6 max-w-3xl border-blue-200/80 dark:border-blue-900/50">
      {body}
    </Card>
  );
}

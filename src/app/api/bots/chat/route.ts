import { NextRequest, NextResponse } from 'next/server';

import { runBotChat } from '@/lib/botChatRuntime';
import type { Bot } from '@/types/project';

type Body = {
  bot?: unknown;
  message?: unknown;
};

function isBotShape(v: unknown): v is Bot {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.type === 'string' &&
    typeof b.config === 'object' &&
    b.config !== null &&
    !Array.isArray(b.config)
  );
}

/**
 * Test chat against a bot configuration. The client sends the full `Bot` record
 * (including credentials from the project store) — same pattern as other
 * designer APIs that operate on in-memory project state.
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const message =
    typeof body.message === 'string' ? body.message : String(body.message ?? '');

  if (!isBotShape(body.bot)) {
    return NextResponse.json(
      { ok: false, error: 'Request needs a valid `bot` object and `message`.' },
      { status: 400 },
    );
  }

  const result = await runBotChat(body.bot, message);
  return NextResponse.json(result);
}

/**
 * POST /api/cors-proxy
 *
 * A server-side proxy to bypass browser CORS restrictions.
 * Accepts a JSON payload with the target URL, method, headers, and body,
 * makes the request from the server (where CORS doesn't apply), and
 * pipes the response back to the client.
 */
import { NextRequest, NextResponse } from 'next/server';

function extractErrorMessage(data: unknown, status: number): string {
  if (typeof data === 'string' && data.trim()) {
    return data.length > 200 ? data.slice(0, 200) + '...' : data;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.errorMessage === 'string') return obj.errorMessage;
    if (obj.errors && Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && typeof (first as Record<string, unknown>).message === 'string') {
        return (first as Record<string, unknown>).message as string;
      }
    }
  }
  return `Request failed with status ${status}`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      url,
      method,
      headers: clientHeaders,
      body: clientBody,
    } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const hasBody = clientBody && !['GET', 'DELETE'].includes(method);

    const res = await fetch(url, {
      method,
      headers: clientHeaders,
      body: hasBody ? clientBody : undefined,
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const html = await res.text();
      return new NextResponse(html, {
        status: res.status,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    let body: unknown;
    const resHeaders = Object.fromEntries(res.headers.entries());

    if (contentType.includes('application/json')) {
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
    } else {
      body = await res.text();
    }

    const response: {
      ok: boolean;
      status: number;
      data: unknown;
      headers: Record<string, string>;
      error?: string;
    } = { ok: res.ok, status: res.status, data: body, headers: resHeaders };

    if (!res.ok) {
      response.error = extractErrorMessage(body, res.status);
    }

    return NextResponse.json(
      response,
      { status: 200 }, // The proxy request itself was successful
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';

/**
 * Headers and URL path helpers for Swaggen project / user context (bots chat,
 * pipeline run, middleware preview) flowing into `PipelineContext` for
 * user-authored middleware.
 */
export const SWAGGEN_PROJECT_ID_HEADER = 'x-swaggen-project-id';
export const SWAGGEN_USER_ID_HEADER = 'x-swaggen-user-id';

export function readSwaggenHeader(
  req: { headers: Headers },
  name: string,
): string | undefined {
  const v = req.headers.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Designer bot chat endpoint. Use `_` for `userIdSegment` when no authenticated user.
 * Shape: `/api/bots/{projectId}/{userId}/chat`
 */
export function decodePathSegment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Path params for designer APIs: `/api/.../{projectId}/{userId}/...`.
 * Use `_` (or `none`) for `rawUserId` when there is no authenticated user.
 */
export function swaggenIdsFromPathParams(
  rawProjectId: string,
  rawUserId: string,
):
  | { ok: true; projectId: string; userIdForHeader: string | null }
  | { ok: false } {
  const projectId = decodePathSegment(rawProjectId).trim();
  const userSeg = decodePathSegment(rawUserId).trim();
  if (!projectId || projectId === '_') {
    return { ok: false };
  }
  const userIdForHeader =
    userSeg === '_' || userSeg.toLowerCase() === 'none' || userSeg === ''
      ? null
      : userSeg;
  return { ok: true, projectId, userIdForHeader };
}

export function buildBotChatApiPath(
  projectId: string,
  userIdSegment: string,
): string {
  const pid = projectId.trim();
  const uid = userIdSegment.trim() || '_';
  return `/api/bots/${encodeURIComponent(pid)}/${encodeURIComponent(uid)}/chat`;
}

/** `POST /api/pipelines/{projectId}/{userId}/run` */
export function buildPipelineRunApiPath(
  projectId: string,
  userIdSegment: string,
): string {
  const pid = projectId.trim();
  const uid = userIdSegment.trim() || '_';
  return `/api/pipelines/${encodeURIComponent(pid)}/${encodeURIComponent(uid)}/run`;
}

/** `POST /api/middleware-preview/{projectId}/{userId}` */
export function buildMiddlewarePreviewApiPath(
  projectId: string,
  userIdSegment: string,
): string {
  const pid = projectId.trim();
  const uid = userIdSegment.trim() || '_';
  return `/api/middleware-preview/${encodeURIComponent(pid)}/${encodeURIComponent(uid)}`;
}

/** Clone a Next.js request and set the Swaggen project id header (server-side truth for `/api/{slug}/…`). */
export function cloneNextRequestWithSwaggenProject(
  req: NextRequest,
  projectId: string,
): NextRequest {
  const h = new Headers(req.headers);
  h.set(SWAGGEN_PROJECT_ID_HEADER, projectId);
  if (req.method === 'GET' || req.method === 'HEAD') {
    return new NextRequest(req.url, { method: req.method, headers: h });
  }
  return new NextRequest(req.url, {
    method: req.method,
    headers: h,
    body: req.body,
    duplex: 'half',
  });
}

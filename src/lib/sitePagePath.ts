/** Single path segment in Next.js dynamic form, e.g. `[id]` or `[slug]` */
const DYNAMIC_SEGMENT = /^\[[^\]]+\]$/;

/** Normalize stored page path to a canonical form starting with `/` */
export function normalizePagePath(path: string | undefined | null): string {
  const t = (path ?? '').trim();
  if (!t) return '/';
  return t.startsWith('/') ? t : `/${t}`;
}

function pathSegments(path: string | undefined | null): string[] {
  const n = normalizePagePath(path);
  if (n === '/') return [];
  return n.slice(1).split('/').filter(Boolean);
}

/**
 * True if `concretePath` matches `patternPath`, where pattern segments may be
 * Next-style params (`[id]`, `[slug]`) matching any single URL segment.
 */
export function routePatternMatches(
  patternPath: string | undefined | null,
  concretePath: string | undefined | null,
): boolean {
  const ps = pathSegments(patternPath);
  const cs = pathSegments(concretePath);
  if (ps.length !== cs.length) return false;
  for (let i = 0; i < ps.length; i++) {
    if (DYNAMIC_SEGMENT.test(ps[i])) continue;
    if (ps[i] !== cs[i]) return false;
  }
  return true;
}

/** Build path from Next.js catch-all segments (undefined = site root) */
export function pathFromSegments(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

/**
 * Match page path (possibly with `[param]` segments) to a real URL path.
 */
export function pathsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  if (normalizePagePath(a) === normalizePagePath(b)) return true;
  const as = pathSegments(a);
  const bs = pathSegments(b);
  const aDyn = as.some(s => DYNAMIC_SEGMENT.test(s));
  const bDyn = bs.some(s => DYNAMIC_SEGMENT.test(s));
  if (aDyn && !bDyn) return routePatternMatches(a, b);
  if (!aDyn && bDyn) return routePatternMatches(b, a);
  return false;
}

/**
 * Path safe for `/site/...` links: dynamic segments become `preview` so the
 * URL resolves without literal `[id]` in the address bar.
 */
export function concretePathForPublicSite(
  pagePath: string | undefined | null,
): string {
  const parts = pathSegments(pagePath);
  if (parts.length === 0) return '/';
  const out = parts.map(seg =>
    DYNAMIC_SEGMENT.test(seg) ? 'preview' : seg,
  );
  return `/${out.join('/')}`;
}

import fs from 'node:fs';
import path from 'node:path';

import type { UIPage } from '@/types/project';

const PKG_ROOT = process.cwd();

function copyLibFile(relFromSrc: string, destDir: string, destName?: string) {
  const from = path.join(PKG_ROOT, 'src', relFromSrc);
  if (!fs.existsSync(from)) {
    console.warn(`[generateSiteExport] missing source file: ${from}`);
    return;
  }
  const content = fs.readFileSync(from, 'utf-8');
  const base = destName ?? path.basename(relFromSrc);
  const to = path.join(destDir, base);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, content, 'utf-8');
}

/**
 * Embeds published pages (Swaggen canvas JSON) and an optional full project snapshot into
 * the generated Next.js ZIP alongside API/middleware code.
 */
export function writeSiteExportToProject(
  projectDir: string,
  opts: {
    pages: UIPage[];
    projectSnapshot?: unknown;
    projectName: string;
  },
): void {
  const srcDir = path.join(projectDir, 'src');
  const genDir = path.join(srcDir, 'generated');
  fs.mkdirSync(genDir, { recursive: true });

  fs.writeFileSync(
    path.join(genDir, 'swaggen-site-pages.json'),
    JSON.stringify(opts.pages, null, 2),
    'utf-8',
  );

  if (opts.projectSnapshot !== undefined) {
    fs.writeFileSync(
      path.join(genDir, 'swaggen-project-export.json'),
      JSON.stringify(opts.projectSnapshot, null, 2),
      'utf-8',
    );
  }

  const swaggenComponentsDir = path.join(srcDir, 'components', 'swaggen');
  copyLibFile('types/swaggenCanvas.ts', path.join(srcDir, 'types'));
  copyLibFile(
    'components/swaggen/SwaggenPageRenderer.tsx',
    swaggenComponentsDir,
  );

  const siteDir = path.join(srcDir, 'app', 'site', '[[...path]]');
  fs.mkdirSync(siteDir, { recursive: true });

  const sitePageTsx = `import { notFound } from 'next/navigation';

import { SwaggenPageRenderer } from '@/components/swaggen/SwaggenPageRenderer';
import sitePages from '@/generated/swaggen-site-pages.json';

type ExportedPage = {
  id: string;
  name: string;
  path: string;
  description?: string;
  components?: unknown[];
  editorMode?: string;
  swaggenDocument?: import('@/types/swaggenCanvas').SwaggenDocument;
};

const DYNAMIC_SEGMENT = /^\\[[^\\]]+\\]$/;

function normalizePagePath(p: string | undefined | null): string {
  const t = (p ?? '').trim();
  if (!t) return '/';
  return t.startsWith('/') ? t : \`/\${t}\`;
}

function pathSegments(p: string | undefined | null): string[] {
  const n = normalizePagePath(p);
  if (n === '/') return [];
  return n.slice(1).split('/').filter(Boolean);
}

function pathFromSegments(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) return '/';
  return \`/\${segments.join('/')}\`;
}

function routePatternMatches(
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

function pathsMatch(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  if (normalizePagePath(a) === normalizePagePath(b)) return true;
  const as = pathSegments(a);
  const bs = pathSegments(b);
  const aDyn = as.some(s => DYNAMIC_SEGMENT.test(s));
  const bDyn = bs.some(s => DYNAMIC_SEGMENT.test(s));
  if (aDyn && !bDyn) return routePatternMatches(a, b);
  if (!aDyn && bDyn) return routePatternMatches(b, a);
  return false;
}

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path: segments } = await params;
  const urlPath = pathFromSegments(segments);
  const pages = sitePages as ExportedPage[];
  const page = pages.find(p => pathsMatch(p.path, urlPath));
  if (!page) notFound();

  const doc = page.swaggenDocument;
  const hasCanvas = Boolean(doc && doc.elements.length > 0);

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs text-zinc-500">{${JSON.stringify(opts.projectName)}}</p>
        <h1 className="text-lg font-semibold text-zinc-900">{page.name || 'Page'}</h1>
      </header>
      <main className="mx-auto max-w-[100vw] overflow-x-auto p-4">
        {hasCanvas && doc ? (
          <SwaggenPageRenderer document={doc} />
        ) : (
          <p className="text-sm text-zinc-500">
            No canvas content for this path. Edit the page in Swaggen and re-export, or add layers on the canvas.
          </p>
        )}
      </main>
    </div>
  );
}
`;

  fs.writeFileSync(path.join(siteDir, 'page.tsx'), sitePageTsx, 'utf-8');

  const readmeSite = path.join(projectDir, 'SWAGGEN_SITE.md');
  fs.writeFileSync(
    readmeSite,
    [
      `# Swaggen exported site routes`,
      ``,
      `Public pages are served at \`/site/...\` (same as the Swaggen app).`,
      ``,
      `- \`src/generated/swaggen-site-pages.json\` — page documents (canvas + metadata).`,
      `- \`src/generated/swaggen-project-export.json\` — full project snapshot (when included).`,
      ``,
      `Run \`npm run dev\` and open e.g. \`http://localhost:3000/site\` for the home path, or \`/site/your-path\` for other routes.`,
      ``,
      `**Security:** \`swaggen-project-export.json\` may include connection strings and secrets. Do not commit it to public repos without redacting.`,
      ``,
    ].join('\n'),
    'utf-8',
  );
}

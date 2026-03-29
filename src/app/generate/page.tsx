'use client';

import { Download, FolderOpen, PackageOpen, Play } from 'lucide-react';
import { useCallback, useState } from 'react';

import PageShell from '@/components/PageShell';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { buildOpenApiSpec } from '@/lib/specBuilder';
import { useProjectStore } from '@/store/projectStore';

interface GenerateMeta {
  filesCount: number;
  interfacesCount: number;
  schemasCount: number;
  routesCount: number;
  /** Object URL pointing to the downloaded ZIP blob — revoked after save. */
  zipUrl: string;
  zipName: string;
}

export default function GeneratePage() {
  const project = useProjectStore(s => s.activeProject());

  const [meta, setMeta] = useState<GenerateMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!project) return;

    setLoading(true);
    setError(null);

    // Revoke any previous object URL to avoid memory leaks
    if (meta?.zipUrl) URL.revokeObjectURL(meta.zipUrl);
    setMeta(null);

    try {
      const spec =
        project.entities.length > 0
          ? buildOpenApiSpec(
              project.name,
              project.entities,
              project.relations,
              project.services,
              project.middlewares,
              project.apiPaths ?? [],
            )
          : JSON.parse(project.openApiSpec);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec,
          projectName: project.name,
          middlewares: project.middlewares,
          services: project.services,
          dataStorage: project.dataStorage,
          pages: project.pages ?? [],
          projectSnapshot: project,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? 'Generation failed');
      }

      // Read ZIP binary and create an object URL for the download button
      const blob = await response.blob();
      const zipUrl = URL.createObjectURL(blob);
      const zipName =
        response.headers
          .get('Content-Disposition')
          ?.match(/filename="(.+?)"/)?.[1] ??
        `${project.name.toLowerCase().replace(/\s+/g, '-')}.zip`;

      setMeta({
        zipUrl,
        zipName,
        filesCount: Number(response.headers.get('X-Files-Count') ?? 0),
        interfacesCount: Number(
          response.headers.get('X-Interfaces-Count') ?? 0,
        ),
        schemasCount: Number(response.headers.get('X-Schemas-Count') ?? 0),
        routesCount: Number(response.headers.get('X-Routes-Count') ?? 0),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [project, meta?.zipUrl]);

  const handleDownload = useCallback(() => {
    if (!meta) return;
    const a = document.createElement('a');
    a.href = meta.zipUrl;
    a.download = meta.zipName;
    a.click();
  }, [meta]);

  if (!project) {
    return (
      <PageShell title="Generate">
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Generate & Download"
      description={`Download a Next.js project ZIP with API routes, middleware, services, public /site pages (Swaggen canvas), and a full project JSON snapshot.`}
      actions={
        <div className="flex gap-2">
          {meta && (
            <Button variant="secondary" onClick={handleDownload}>
              <Download size={16} /> Download ZIP
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={loading}>
            <Play size={16} /> {loading ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      }
    >
      {/* Project summary */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
          Project Summary
        </h2>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{project.entities.length} entities</span>
          <span>· {project.relations.length} relations</span>
          <span>· {project.middlewares.length} middlewares</span>
          <span>· {project.services.length} services</span>
          <span>
            · Storage:{' '}
            <Badge
              variant={project.dataStorage.enabled ? 'success' : 'default'}
            >
              {project.dataStorage.provider}
            </Badge>
          </span>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Result */}
      {meta && (
        <Card>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <PackageOpen
                size={20}
                className="text-green-600 dark:text-green-400"
              />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Project ready —{' '}
                <span className="font-mono">{meta.zipName}</span>
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                A complete Next.js project scaffold with your generated code
                overlaid inside{' '}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  src/
                </code>
                . Unzip and run{' '}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  npm install && npm run dev
                </code>{' '}
                to get started.
              </p>

              {/* Stats */}
              <div className="mt-3 flex flex-wrap gap-3">
                <Stat label="files" value={meta.filesCount} />
                <Stat label="interfaces" value={meta.interfacesCount} />
                <Stat label="Zod schemas" value={meta.schemasCount} />
                <Stat label="route handlers" value={meta.routesCount} />
              </div>

              {/* Folder structure diagram */}
              <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {meta.zipName.replace('.zip', '')}/
                </p>
                <FolderLine name="src/" indent={1}>
                  <FolderLine name="app/" indent={2}>
                    <FileLine name="layout.tsx" indent={3} />
                    <FileLine name="page.tsx" indent={3} />
                    <FolderLine name="api/" indent={3} />
                  </FolderLine>
                  <FolderLine name="interfaces/" indent={2} />
                  <FolderLine name="lib/" indent={2} />
                  <FolderLine name="middlewares/" indent={2} />
                  <FolderLine name="services/" indent={2} />
                  <FolderLine name="validation/" indent={2} />
                </FolderLine>
                <FileLine name="package.json" indent={1} />
                <FileLine name="tsconfig.json" indent={1} />
                <FileLine name="next.config.ts" indent={1} />
                <FileLine name=".gitignore" indent={1} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleDownload}>
              <Download size={16} /> Download ZIP
            </Button>
          </div>
        </Card>
      )}

      {/* Empty state before generation */}
      {!meta && !loading && !error && (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <PackageOpen size={40} className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Click <strong>Generate</strong> to scaffold a complete Next.js
            project
          </p>
          <p className="max-w-sm text-xs text-zinc-400 dark:text-zinc-500">
            Your project builder configuration (entities, middlewares, services)
            will be generated and bundled with a full Next.js scaffold, then
            downloaded as a ZIP.
          </p>
        </Card>
      )}
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
      <strong>{value}</strong> {label}
    </span>
  );
}

function FolderLine({
  name,
  indent,
  children,
}: {
  name: string;
  indent: number;
  children?: React.ReactNode;
}) {
  return (
    <>
      <p style={{ paddingLeft: `${(indent - 1) * 16}px` }}>
        {'├── '}
        <span className="text-blue-600 dark:text-blue-400">{name}</span>
      </p>
      {children}
    </>
  );
}

function FileLine({ name, indent }: { name: string; indent: number }) {
  return (
    <p style={{ paddingLeft: `${(indent - 1) * 16}px` }}>
      {'├── '}
      {name}
    </p>
  );
}

'use client';

import { ComponentRenderer } from '@/components/designer/ComponentRenderer';
import { PageRuntimeProvider } from '@/components/designer/PageRuntimeContext';
import { SwaggenPageRenderer } from '@/components/swaggen/SwaggenPageRenderer';
import {
  pageHasSwaggenCanvas,
  pageHasInteractiveComponents,
} from '@/lib/publicPageRender';
import type { Entity, UIPage } from '@/types/project';

interface PublicSitePageViewProps {
  projectName: string;
  page: UIPage;
  entities: Entity[];
}

export function PublicSitePageView({
  projectName,
  page,
  entities,
}: PublicSitePageViewProps) {
  const hasSwaggenCanvas = pageHasSwaggenCanvas(page);
  const hasUi = pageHasInteractiveComponents(page);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500">{projectName}</p>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {page.name || 'Untitled page'}
        </h1>
      </header>
      <main className="mx-auto max-w-[100vw] overflow-x-auto p-4">
        <div className="mx-auto max-w-6xl space-y-10">
          {hasSwaggenCanvas && page.swaggenDocument && (
            <section>
              <PageRuntimeProvider
                initialEntityValues={page.previewEntityValues}
              >
                <SwaggenPageRenderer
                  document={page.swaggenDocument}
                  entities={entities}
                />
              </PageRuntimeProvider>
            </section>
          )}

          {!hasSwaggenCanvas && hasUi && (
            <section>
              <PageRuntimeProvider
                initialEntityValues={page.previewEntityValues}
              >
                <div className="relative mx-auto min-h-[min(60vh,720px)] w-full max-w-6xl rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
                  {(page.components ?? []).map(comp => (
                    <div
                      key={comp.id}
                      className="pointer-events-auto"
                      style={{
                        position: 'absolute',
                        left: comp.position?.x ?? 0,
                        top: comp.position?.y ?? 0,
                        width: comp.size?.width ?? 300,
                        minHeight: comp.size?.height ?? 60,
                      }}
                    >
                      <ComponentRenderer
                        component={comp}
                        entities={entities}
                        siblingComponents={page.components ?? []}
                      />
                    </div>
                  ))}
                </div>
              </PageRuntimeProvider>
            </section>
          )}

          {!hasSwaggenCanvas && !hasUi && (
            <p className="text-sm text-zinc-500">
              This page has no content yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

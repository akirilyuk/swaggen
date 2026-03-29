'use client';

import { useMemo } from 'react';

import { SwaggenPageRenderer } from '@/components/swaggen/SwaggenPageRenderer';

import { swaggenPreviewScale } from '@/lib/swaggenPreviewScale';
import {
  pageHasSwaggenCanvas,
  pageHasInteractiveComponents,
} from '@/lib/publicPageRender';

import { ComponentRenderer } from './ComponentRenderer';
import { PageRuntimeProvider } from './PageRuntimeContext';
import type { UIPage, Entity } from '@/types/project';

/** Fits the fake browser preview column on the Pages screen (right rail / narrow layouts). */
const PREVIEW_MAX_W = 480;
const PREVIEW_MAX_H = 360;

interface PagePreviewProps {
  page: UIPage;
  entities: Entity[];
  /**
   * When false, parent must wrap with `PageRuntimeProvider` (e.g. Pages editor).
   * When true (default), this component provides the runtime.
   */
  embedRuntime?: boolean;
}

export function PagePreview({
  page,
  entities,
  embedRuntime = true,
}: PagePreviewProps) {
  const hasSwaggenCanvas = pageHasSwaggenCanvas(page);
  const hasUi = pageHasInteractiveComponents(page);

  const canvasPreviewScale = useMemo(
    () =>
      page.swaggenDocument
        ? swaggenPreviewScale(
            page.swaggenDocument,
            PREVIEW_MAX_W,
            PREVIEW_MAX_H,
          )
        : 1,
    [page.swaggenDocument],
  );

  const legacyBounds = useMemo(() => {
    const comps = page.components ?? [];
    let maxR = 640;
    let maxB = 480;
    for (const c of comps) {
      const x = c.position?.x ?? 0;
      const y = c.position?.y ?? 0;
      const w = c.size?.width ?? 300;
      const h = c.size?.height ?? 120;
      maxR = Math.max(maxR, x + w);
      maxB = Math.max(maxB, y + h);
    }
    return { maxR, maxB };
  }, [page.components]);

  const legacyScale = useMemo(() => {
    const { maxR, maxB } = legacyBounds;
    return Math.min(1, PREVIEW_MAX_W / maxR, PREVIEW_MAX_H / maxB);
  }, [legacyBounds]);

  const legacyCanvas = () => (
    <div
      className="relative mx-auto overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50"
      style={{
        width: legacyBounds.maxR * legacyScale,
        height: legacyBounds.maxB * legacyScale,
      }}
    >
      <div
        className="relative"
        style={{
          width: legacyBounds.maxR,
          height: legacyBounds.maxB,
          transform: `scale(${legacyScale})`,
          transformOrigin: 'top left',
        }}
      >
        {(page.components ?? []).map(comp => (
          <div
            key={comp.id}
            className="pointer-events-auto"
            style={{
              position: 'absolute',
              left: comp.position?.x || 0,
              top: comp.position?.y || 0,
              width: comp.size?.width || 300,
              minHeight: comp.size?.height || 60,
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
    </div>
  );

  const canvasPreviewBlock =
    hasSwaggenCanvas && page.swaggenDocument ? (
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
          Page preview
        </p>
        <div className="flex w-full min-w-0 max-w-full justify-center overflow-hidden">
          <SwaggenPageRenderer
            document={page.swaggenDocument}
            entities={entities}
            scale={canvasPreviewScale}
          />
        </div>
      </section>
    ) : null;

  const legacyBlock =
    !hasSwaggenCanvas && hasUi ? (
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
          Legacy components
        </p>
        <div className="flex w-full min-w-0 justify-center overflow-hidden p-1">
          {legacyCanvas()}
        </div>
      </section>
    ) : null;

  const inner =
    embedRuntime ? (
      <>
        {hasSwaggenCanvas && page.swaggenDocument ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
              Page preview
            </p>
            <div className="flex w-full min-w-0 max-w-full justify-center overflow-hidden">
              <PageRuntimeProvider
                initialEntityValues={page.previewEntityValues}
              >
                <SwaggenPageRenderer
                  document={page.swaggenDocument}
                  entities={entities}
                  scale={canvasPreviewScale}
                />
              </PageRuntimeProvider>
            </div>
          </section>
        ) : null}

        {!hasSwaggenCanvas && hasUi ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
              Legacy components
            </p>
            <PageRuntimeProvider initialEntityValues={page.previewEntityValues}>
              <div className="flex w-full min-w-0 justify-center overflow-hidden p-1">
                {legacyCanvas()}
              </div>
            </PageRuntimeProvider>
          </section>
        ) : null}
      </>
    ) : (
      <>
        {canvasPreviewBlock}
        {legacyBlock}
      </>
    );

  return (
    <div className="flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 min-h-0 max-h-[min(92vh,900px)]">
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex shrink-0 gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-inner" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-inner" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-inner" />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1 text-[11px] text-zinc-500 flex items-center gap-1.5 overflow-hidden dark:border-zinc-700 dark:bg-zinc-800">
          <span className="shrink-0 font-bold uppercase tracking-tighter opacity-50">
            https
          </span>
          <span className="shrink-0 text-zinc-400">:</span>
          <span className="shrink-0 font-medium opacity-50">app</span>
          <span className="shrink-0 text-zinc-400">/</span>
          <span className="min-w-0 truncate font-bold text-zinc-900 dark:text-zinc-100">
            {(page.path || '').replace(/^\//, '') || '(main)'}
          </span>
        </div>
      </div>

      <div className="relative max-h-[min(78vh,760px)] min-h-[280px] overflow-y-auto overflow-x-hidden bg-white p-5 dark:bg-zinc-950 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {inner}

          {!hasSwaggenCanvas && !hasUi && (
            <p className="text-sm text-zinc-500 text-center py-12">
              No content yet — add layers on the Swaggen canvas and widgets from
              the left rail.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

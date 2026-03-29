'use client';

import { Database, Link2, Trash2 } from 'lucide-react';

import { EntityFieldPreview } from '@/components/designer/EntityFieldPreview';
import type { SwaggenElement } from '@/types/swaggenCanvas';
import type { Entity } from '@/types/project';

interface EntityBindingOverviewProps {
  /** Layers from the page canvas document (bindings live on these elements) */
  elements: SwaggenElement[];
  entities: Entity[];
  /** When true, field previews use page runtime (designer with PageRuntimeProvider) */
  interactiveFieldPreview?: boolean;
  /** Click field name in preview to insert token into selected layer */
  onFieldNameClick?: (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => void;
  /** When set, each linked layer row shows a control to remove that layer from the canvas */
  onRemoveLayer?: (elementId: string) => void;
}

function linkedRows(elements: SwaggenElement[]) {
  const rows: {
    id: string;
    label: string;
    entityId: string;
    visibleFields: string[];
  }[] = [];
  for (const el of elements) {
    if (el.kind === 'widget' && el.widget?.entityId) {
      rows.push({
        id: el.id,
        label: el.widget.title || el.widget.template,
        entityId: el.widget.entityId,
        visibleFields: el.widget.visibleFields ?? [],
      });
    } else if (el.dataBinding?.entityId) {
      rows.push({
        id: el.id,
        label: el.name,
        entityId: el.dataBinding.entityId,
        visibleFields: el.dataBinding.visibleFields ?? [],
      });
    }
  }
  return rows;
}

/**
 * Page-level map of entity bindings on canvas layers (text, image, widgets).
 */
export function EntityBindingOverview({
  elements,
  entities,
  interactiveFieldPreview = false,
  onFieldNameClick,
  onRemoveLayer,
}: EntityBindingOverviewProps) {
  const linked = linkedRows(elements);

  if (linked.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/95 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/40">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            <Database size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              No entity links on layers yet
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/85 dark:text-amber-200/90">
              Select a text or widget layer, then use the{' '}
              <strong>Layers</strong> section (left sidebar) to pick an entity and
              fields, or drag
              from below onto a layer on the artboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 px-4 py-3 shadow-md dark:border-amber-700 dark:from-amber-950/60 dark:via-zinc-900/50 dark:to-amber-950/30">
      <div className="mb-2 flex items-center gap-2 border-b border-amber-200/80 pb-2 dark:border-amber-800/80">
        <Link2 size={16} className="text-amber-700 dark:text-amber-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100">
          Entity → layer map
        </span>
        <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-100">
          {linked.length} link{linked.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {linked.map(row => {
          const ent = entities.find(e => e.id === row.entityId);
          const entityName = ent?.name ?? 'Unknown entity';
          const fields =
            row.visibleFields.length > 0
              ? row.visibleFields.join(', ')
              : 'all fields';
          const uiLabel = row.label.replace(/-/g, ' ');

          return (
            <li
              key={row.id}
              className="flex min-w-0 flex-1 basis-[260px] items-center gap-2 rounded-lg border border-amber-300/90 bg-white/95 px-3 py-2.5 text-sm shadow-sm dark:border-amber-800 dark:bg-zinc-900/90"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                title="Entity"
              >
                <Database size={16} />
              </span>
              <div className="min-w-0 min-h-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="font-bold text-amber-950 dark:text-amber-50">
                    {entityName}
                  </span>
                  <span className="text-amber-600 dark:text-amber-500">→</span>
                  <span
                    className="font-medium capitalize text-zinc-800 dark:text-zinc-100"
                    title="Layer"
                  >
                    {uiLabel}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] leading-snug text-amber-800/90 dark:text-amber-300/95">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    fields:{' '}
                  </span>
                  {fields}
                </div>
                {ent && (
                  <EntityFieldPreview
                    className="mt-2 max-h-28 border-amber-200/80 bg-white/80 dark:border-amber-900/50 dark:bg-zinc-950/40"
                    entity={ent}
                    interactive={interactiveFieldPreview}
                    onFieldNameClick={onFieldNameClick}
                  />
                )}
              </div>
              {onRemoveLayer && (
                <button
                  type="button"
                  className="shrink-0 self-start rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                  title="Remove this layer from the page"
                  aria-label={`Remove layer ${uiLabel}`}
                  onClick={() => onRemoveLayer(row.id)}
                >
                  <Trash2 size={16} strokeWidth={2.25} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

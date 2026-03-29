/**
 * Shared visual language for the Swaggen editor left rail: element tools, widget template
 * tiles, embedded palette templates, and on-canvas widget frames.
 */

export const sidebarSectionLabelClass =
  'mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-zinc-400';

/** Wrapper around a group of tiles (matches palette `Card`). */
export const sidebarTileGroupClass =
  'rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50';

export const sidebarTileGridClass = 'grid grid-cols-2 gap-2';

/**
 * Click/drag tile: same chrome for native elements (Text, shapes…) and
 * UI component templates (Button, inputs…).
 */
export const sidebarInteractiveTileClass =
  'flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center shadow-sm transition-all hover:border-violet-400 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-violet-500';

export const sidebarInteractiveTileLabelClass =
  'w-full truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400';

export const sidebarInteractiveTileIconClass =
  'shrink-0 text-zinc-500 dark:text-zinc-400';

/** Widget layer on the artboard — matches unselected template tile chrome. */
export const canvasWidgetFrameClass =
  'flex h-full w-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900';

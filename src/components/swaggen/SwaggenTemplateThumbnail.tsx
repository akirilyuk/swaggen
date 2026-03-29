'use client';

import { ARTBOARD_PRESETS } from '@/lib/swaggenPresets';
import type { SwaggenLayoutTemplatePreview } from '@/lib/swaggenTemplatePreview';
import {
  BLANK_CANVAS_PREVIEW_SRC,
  templatePreviewImageUrl,
} from '@/lib/templatePreviewAssets';

interface SwaggenTemplateThumbnailProps {
  presetId: string;
  /** Still passed for typing parity with templates; not used for painting (JPEG cover only). */
  preview: SwaggenLayoutTemplatePreview;
  className?: string;
  /**
   * Large, high-contrast frame for template pickers (vs compact inset cards).
   */
  variant?: 'default' | 'gallery';
  /**
   * Explicit JPEG/PNG path (e.g. blank canvas). Takes precedence over `templateId`.
   */
  coverSrc?: string;
  /**
   * When set without `coverSrc`, loads `/template-previews/{templateId}.jpg`.
   */
  templateId?: string;
  coverAlt?: string;
}

export function SwaggenTemplateThumbnail({
  presetId,
  preview: _preview,
  className = '',
  variant = 'default',
  coverSrc,
  templateId,
  coverAlt = '',
}: SwaggenTemplateThumbnailProps) {
  const preset = ARTBOARD_PRESETS.find(p => p.id === presetId);
  const ratio = preset ? preset.width / preset.height : 1;
  const gallery = variant === 'gallery';

  const resolvedSrc =
    coverSrc ??
    (templateId != null ? templatePreviewImageUrl(templateId) : undefined) ??
    BLANK_CANVAS_PREVIEW_SRC;

  const frameClass = gallery
    ? `relative w-full min-h-[200px] overflow-hidden rounded-t-xl bg-zinc-300 shadow-md ring-2 ring-zinc-400/90 dark:bg-zinc-700 dark:ring-zinc-500/90 sm:min-h-[240px] md:min-h-[280px] ${className}`
    : `relative w-full overflow-hidden rounded-md bg-zinc-200 shadow-inner ring-1 ring-black/10 dark:ring-white/10 ${className}`;

  const frameStyle =
    gallery && resolvedSrc
      ? { aspectRatio: ratio }
      : gallery
        ? undefined
        : { aspectRatio: ratio };

  return (
    <div
      className={`relative isolate w-full min-w-0 ${frameClass}`}
      style={frameStyle}
    >
      <img
        src={resolvedSrc}
        alt={coverAlt}
        className="absolute inset-0 z-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {gallery && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-t-xl ring-1 ring-inset ring-black/20 dark:ring-white/15"
          aria-hidden
        />
      )}
    </div>
  );
}

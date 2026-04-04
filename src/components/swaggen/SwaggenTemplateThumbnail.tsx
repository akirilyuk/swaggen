'use client';

import { useEffect, useMemo, useState } from 'react';

import { ARTBOARD_PRESETS } from '@/lib/swaggenPresets';
import type { SwaggenLayoutTemplatePreview } from '@/lib/swaggenTemplatePreview';
import {
  BLANK_CANVAS_PREVIEW_SRC,
  blankCanvasPreviewDataUri,
  templatePreviewImageUrl,
  templateVectorPreviewDataUri,
} from '@/lib/templatePreviewAssets';

interface SwaggenTemplateThumbnailProps {
  presetId: string;
  /** Drives generated vector thumbnail (gradient, layout shapes, label lines). */
  preview: SwaggenLayoutTemplatePreview;
  /** Prefer over parsing `coverAlt` for the label inside the vector preview. */
  templateName?: string;
  className?: string;
  /**
   * Large, high-contrast frame for template pickers (vs compact inset cards).
   */
  variant?: 'default' | 'gallery';
  /**
   * External image (e.g. app-starter SVG). `BLANK_CANVAS_PREVIEW_SRC` is resolved to an inline SVG.
   */
  coverSrc?: string;
  /** Loads `/template-previews/{id}.jpg` (run `pnpm run generate:template-previews -- --write` if missing). */
  templateId?: string;
  coverAlt?: string;
}

export function SwaggenTemplateThumbnail({
  presetId,
  preview,
  templateName,
  className = '',
  variant = 'default',
  coverSrc,
  templateId,
  coverAlt = '',
}: SwaggenTemplateThumbnailProps) {
  const preset = ARTBOARD_PRESETS.find(p => p.id === presetId);
  const ratio = preset ? preset.width / preset.height : 1;
  const gallery = variant === 'gallery';

  const displayName =
    templateName?.trim() ||
    coverAlt.replace(/\s+preview\s*$/i, '').trim() ||
    'Layout';

  const vectorFallbackSrc = useMemo(() => {
    if (coverSrc === BLANK_CANVAS_PREVIEW_SRC) {
      return blankCanvasPreviewDataUri();
    }
    return templateVectorPreviewDataUri({
      presetId,
      preview,
      name: displayName,
    });
  }, [coverSrc, presetId, preview, displayName]);

  const rasterSrc = useMemo(() => {
    if (coverSrc != null && coverSrc !== BLANK_CANVAS_PREVIEW_SRC) {
      return coverSrc;
    }
    if (coverSrc === BLANK_CANVAS_PREVIEW_SRC) {
      return BLANK_CANVAS_PREVIEW_SRC;
    }
    if (templateId != null) {
      return templatePreviewImageUrl(templateId);
    }
    return null;
  }, [coverSrc, templateId]);

  const primarySrc = rasterSrc ?? vectorFallbackSrc;
  const [useVectorFallback, setUseVectorFallback] = useState(false);

  useEffect(() => {
    setUseVectorFallback(false);
  }, [primarySrc]);

  const resolvedSrc = useVectorFallback ? vectorFallbackSrc : primarySrc;

  const frameClass = gallery
    ? `relative w-full min-h-[200px] overflow-hidden rounded-t-xl bg-zinc-300 shadow-md ring-2 ring-zinc-400/90 dark:bg-zinc-700 dark:ring-zinc-500/90 sm:min-h-[240px] md:min-h-[280px] ${className}`
    : `relative w-full overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200/70 dark:bg-zinc-800/60 dark:ring-zinc-700/50 ${className}`;

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
        onError={() => {
          if (!useVectorFallback && rasterSrc != null) {
            setUseVectorFallback(true);
          }
        }}
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

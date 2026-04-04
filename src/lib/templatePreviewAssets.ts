/**
 * Template gallery + cover layers use **`/template-previews/{id}.jpg`** (committed under `public/`).
 * **Stock-photo thumbnails (recommended):** `pnpm run download:template-covers -- --write`
 * — sources in `templateCoverImageSources.ts` (Unsplash / Pexels).
 * **Abstract vector raster JPEGs:** `pnpm run generate:template-previews -- --write` overwrites those files;
 * run `download:template-covers` afterward if you want photos again.
 * `templateVectorPreviewDataUri` / `blankCanvasPreviewDataUri` are fallbacks when a JPEG fails to load.
 */
import type { SwaggenLayoutTemplateDefinition } from '@/lib/swaggenTemplatesRegistry';
import {
  buildBlankCanvasPreviewSvgString,
  buildTemplatePreviewSvgString,
} from '@/lib/templatePreviewSvg';

export function encodeSvgAsDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Raster thumbnail / bottom-layer cover from template metadata (gradients, layout wireframe, title). */
export function templateVectorPreviewDataUri(
  def: Pick<SwaggenLayoutTemplateDefinition, 'presetId' | 'preview' | 'name'>,
): string {
  return encodeSvgAsDataUri(buildTemplatePreviewSvgString(def));
}

export function blankCanvasPreviewDataUri(): string {
  return encodeSvgAsDataUri(buildBlankCanvasPreviewSvgString());
}

export function templatePreviewImageUrl(templateId: string): string {
  return `/template-previews/${templateId}.jpg`;
}

/**
 * Legacy path used in JSX to mean “blank canvas” — thumbnails resolve this to an inline SVG
 * so the card works without `blank-canvas.jpg`.
 */
export const BLANK_CANVAS_PREVIEW_SRC = '/template-previews/blank-canvas.jpg';

/** Gallery thumbnail for the Pages “Detail View” app starter (16:9 wireframe). */
export const DETAIL_VIEW_APP_STARTER_PREVIEW_SRC =
  '/app-starter-previews/detail-view.svg';

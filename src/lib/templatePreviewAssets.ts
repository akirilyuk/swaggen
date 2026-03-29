/**
 * Paths to generated JPEGs in `public/template-previews/`.
 * Photo covers: `pnpm run download:template-covers -- --write` (see `templateCoverImageSources.ts`).
 * New pages / “Apply template” merge this JPEG into the canvas as the bottom image layer (`swaggenDocumentFactory` / `useSwaggenEditor` in the Swaggen editor).
 */
export function templatePreviewImageUrl(templateId: string): string {
  return `/template-previews/${templateId}.jpg`;
}

export const BLANK_CANVAS_PREVIEW_SRC = '/template-previews/blank-canvas.jpg';

/** Gallery thumbnail for the Pages “Detail View” app starter (16:9 wireframe). */
export const DETAIL_VIEW_APP_STARTER_PREVIEW_SRC =
  '/app-starter-previews/detail-view.svg';

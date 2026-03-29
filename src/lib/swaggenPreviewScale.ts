import type { SwaggenDocument } from '@/types/swaggenCanvas';

/** Scale factor so a Swaggen canvas artboard fits inside a preview panel without overflowing. */
export function swaggenPreviewScale(
  doc: SwaggenDocument,
  maxWidthPx: number,
  maxHeightPx: number,
): number {
  const w = doc.artboardWidth;
  const h = doc.artboardHeight;
  if (w <= 0 || h <= 0) return 1;
  return Math.min(1, maxWidthPx / w, maxHeightPx / h);
}

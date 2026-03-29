/**
 * Abstract thumbnail hints for template cards (not pixel copies of Canva designs).
 */
export type SwaggenLayoutTemplatePreviewLayout =
  | 'gradient'
  | 'photoTop'
  | 'splitLeft'
  | 'splitTopBar'
  | 'pollStack'
  | 'cardsRow'
  | 'kpiRow'
  | 'timeline'
  | 'borderedDoc'
  | 'darkPanel'
  | 'minimal'
  | 'fullBleedPhoto';

/** Short copy for raster thumbnails (JPEG) — reflects template purpose */
export interface SwaggenLayoutTemplatePreviewThumb {
  primary: string;
  secondary?: string;
}

export interface SwaggenLayoutTemplatePreview {
  /** CSS background for the thumbnail (gradient or solid) */
  background: string;
  layout: SwaggenLayoutTemplatePreviewLayout;
  /** How to draw abstract lines for `minimal` layout */
  minimalOn?: 'light' | 'dark';
  /** Lines drawn on generated preview JPEGs; also guides abstract fallback styling */
  thumb?: SwaggenLayoutTemplatePreviewThumb;
}

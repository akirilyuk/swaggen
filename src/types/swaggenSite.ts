/**
 * Website-oriented export for Swaggen canvas designs — JSON you can turn into HTML/CSS
 * or feed to a renderer. Not a raster image.
 */

export const SWAGGEN_SITE_SCHEMA = 'swaggen-site/v1' as const;

/** How layers map to CSS in a typical static page export */
export interface SwaggenSiteRenderHints {
  /** Children use position:absolute inside a position:relative canvas */
  childPosition: 'absolute';
  /** Box coordinates are in pixels relative to canvas top-left */
  coordinateOrigin: 'top-left';
  /** Length unit for numeric fields */
  unit: 'px';
}

export interface SwaggenSiteBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
}

export interface SwaggenSiteTextBlock {
  kind: 'text';
  id: string;
  name: string;
  box: SwaggenSiteBox;
  text: {
    content: string;
    fontFamily: string;
    fontSizePx: number;
    fontWeight: number;
    color: string;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
  };
}

export interface SwaggenSiteImageBlock {
  kind: 'image';
  id: string;
  name: string;
  box: SwaggenSiteBox;
  image: {
    src: string;
    objectFit: 'cover' | 'contain' | 'fill';
    objectPosition?: string;
    /** Accessibility */
    alt: string;
  };
}

export interface SwaggenSiteShapeBlock {
  kind: 'shape';
  id: string;
  name: string;
  box: SwaggenSiteBox;
  shape: {
    shapeKind: 'rect' | 'ellipse' | 'line';
    fillCss: string;
    strokeCss: string;
    strokeWidthPx: number;
    borderRadiusPx: number;
  };
}

export type SwaggenSiteLayer =
  | SwaggenSiteTextBlock
  | SwaggenSiteImageBlock
  | SwaggenSiteShapeBlock;

export interface SwaggenSiteCanvas {
  widthPx: number;
  heightPx: number;
  /** CSS background value for the page/canvas root */
  backgroundCss: string;
}

export interface SwaggenSiteExport {
  schema: typeof SWAGGEN_SITE_SCHEMA;
  exportedAt: string;
  meta: {
    source: 'swaggen-next';
    documentId: string;
    documentName: string;
    /** Active project when exported, if any */
    projectId?: string;
  };
  renderHints: SwaggenSiteRenderHints;
  site: {
    /** Same as document name (e.g. HTML document title) */
    title: string;
    canvas: SwaggenSiteCanvas;
    /** Paint order: sorted by zIndex ascending */
    layers: SwaggenSiteLayer[];
  };
}

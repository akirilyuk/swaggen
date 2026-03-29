import type { SwaggenDocument, SwaggenElement } from '@/types/swaggenCanvas';
import type {
  SwaggenSiteBox,
  SwaggenSiteExport,
  SwaggenSiteLayer,
} from '@/types/swaggenSite';
import { SWAGGEN_SITE_SCHEMA } from '@/types/swaggenSite';

function toBox(el: SwaggenElement): SwaggenSiteBox {
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotationDeg: el.rotation,
    opacity: el.opacity,
    zIndex: el.zIndex,
    locked: el.locked,
  };
}

function elementToLayer(el: SwaggenElement): SwaggenSiteLayer | null {
  if (el.kind === 'text' && el.text) {
    return {
      kind: 'text',
      id: el.id,
      name: el.name,
      box: toBox(el),
      text: {
        content: el.text.content,
        fontFamily: el.text.fontFamily,
        fontSizePx: el.text.fontSize,
        fontWeight: el.text.fontWeight,
        color: el.text.color,
        textAlign: el.text.textAlign,
        lineHeight: el.text.lineHeight,
      },
    };
  }
  if (el.kind === 'image' && el.image) {
    return {
      kind: 'image',
      id: el.id,
      name: el.name,
      box: toBox(el),
      image: {
        src: el.image.src,
        objectFit: el.image.objectFit,
        ...(el.image.objectPosition
          ? { objectPosition: el.image.objectPosition }
          : {}),
        alt: '',
      },
    };
  }
  if (el.kind === 'shape' && el.shape) {
    return {
      kind: 'shape',
      id: el.id,
      name: el.name,
      box: toBox(el),
      shape: {
        shapeKind: el.shape.kind,
        fillCss: el.shape.fill,
        strokeCss: el.shape.stroke,
        strokeWidthPx: el.shape.strokeWidth,
        borderRadiusPx: el.shape.borderRadius,
      },
    };
  }
  return null;
}

export function buildSwaggenSiteExport(
  doc: SwaggenDocument,
  options?: { projectId?: string },
): SwaggenSiteExport {
  const layers = [...doc.elements]
    .map(elementToLayer)
    .filter((l): l is SwaggenSiteLayer => l !== null)
    .sort((a, b) => a.box.zIndex - b.box.zIndex);

  return {
    schema: SWAGGEN_SITE_SCHEMA,
    exportedAt: new Date().toISOString(),
    meta: {
      source: 'swaggen-next',
      documentId: doc.id,
      documentName: doc.name,
      ...(options?.projectId ? { projectId: options.projectId } : {}),
    },
    renderHints: {
      childPosition: 'absolute',
      coordinateOrigin: 'top-left',
      unit: 'px',
    },
    site: {
      title: doc.name,
      canvas: {
        widthPx: doc.artboardWidth,
        heightPx: doc.artboardHeight,
        backgroundCss: doc.background,
      },
      layers,
    },
  };
}

export function swaggenSiteExportToJsonString(
  exportData: SwaggenSiteExport,
  pretty = true,
): string {
  return JSON.stringify(exportData, null, pretty ? 2 : 0);
}

export function downloadSwaggenSiteJson(
  doc: SwaggenDocument,
  options?: { projectId?: string },
): void {
  const data = buildSwaggenSiteExport(doc, options);
  const json = swaggenSiteExportToJsonString(data);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const base = doc.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');
  a.download = `${base || 'swaggen-site'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

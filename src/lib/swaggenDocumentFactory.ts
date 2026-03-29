import { v4 as uuid } from 'uuid';

import { ARTBOARD_PRESETS, createEmptyDocument } from '@/lib/swaggenPresets';
import { reindexZ, tplImage } from '@/lib/swaggenTemplatePrimitives';
import { getSwaggenLayoutTemplate } from '@/lib/swaggenTemplatesRegistry';
import { templatePreviewImageUrl } from '@/lib/templatePreviewAssets';
import type { SwaggenDocument, SwaggenElement } from '@/types/swaggenCanvas';

const XY_TOL = 2;
const WH_TOL = 2;

function isFullWidth(el: SwaggenElement, artboardW: number): boolean {
  return (
    Math.abs(el.x) <= XY_TOL && Math.abs(el.width - artboardW) <= WH_TOL
  );
}

/**
 * Uses the same JPEG as the template gallery (`/template-previews/{id}.jpg`) as
 * the bottom of the layer stack: replaces a full-width hero image, swaps out a
 * full-bleed background rect, or prepends a full-bleed photo.
 */
export function mergeTemplateCoverPhotoIntoElements(
  elements: SwaggenElement[],
  artboardW: number,
  artboardH: number,
  coverSrc: string,
): SwaggenElement[] {
  if (elements.length === 0) {
    return reindexZ([
      tplImage(0, 0, artboardW, artboardH, coverSrc, 'cover', 0, 'Template photo'),
    ]);
  }

  const first = elements[0];

  if (
    first.kind === 'image' &&
    first.image &&
    isFullWidth(first, artboardW) &&
    first.y <= XY_TOL
  ) {
    const nextFirst: SwaggenElement = {
      ...first,
      image: {
        ...first.image,
        src: coverSrc,
        objectFit: first.image.objectFit ?? 'cover',
      },
    };
    return reindexZ([nextFirst, ...elements.slice(1)]);
  }

  if (
    first.kind === 'shape' &&
    first.shape?.kind === 'rect' &&
    Math.abs(first.x) <= XY_TOL &&
    Math.abs(first.y) <= XY_TOL &&
    Math.abs(first.width - artboardW) <= WH_TOL &&
    Math.abs(first.height - artboardH) <= WH_TOL
  ) {
    const bg = tplImage(
      0,
      0,
      artboardW,
      artboardH,
      coverSrc,
      'cover',
      0,
      'Template photo',
    );
    return reindexZ([bg, ...elements.slice(1)]);
  }

  const bg = tplImage(
    0,
    0,
    artboardW,
    artboardH,
    coverSrc,
    'cover',
    0,
    'Template photo',
  );
  return reindexZ([bg, ...elements]);
}

/** Build a full document from a gallery template id (see `SWAGGEN_LAYOUT_TEMPLATES`). */
export function buildSwaggenDocumentFromTemplateId(
  templateId: string,
  documentName: string,
): SwaggenDocument {
  if (templateId === 'blank') {
    return createEmptyDocument(ARTBOARD_PRESETS[0], documentName);
  }
  const def = getSwaggenLayoutTemplate(templateId);
  if (!def) {
    return createEmptyDocument(ARTBOARD_PRESETS[0], documentName);
  }
  const preset =
    ARTBOARD_PRESETS.find(p => p.id === def.presetId) ?? ARTBOARD_PRESETS[0];
  const { elements, background } = def.build(preset.width, preset.height);
  const coverSrc = templatePreviewImageUrl(templateId);
  const merged = mergeTemplateCoverPhotoIntoElements(
    elements,
    preset.width,
    preset.height,
    coverSrc,
  );
  return {
    id: uuid(),
    name: documentName,
    artboardWidth: preset.width,
    artboardHeight: preset.height,
    background: background ?? '#ffffff',
    elements: merged,
  };
}

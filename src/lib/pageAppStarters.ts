import { v4 as uuid } from 'uuid';

import { buildSwaggenDocumentFromTemplateId } from '@/lib/swaggenDocumentFactory';
import { uiComponentToSwaggenElement } from '@/lib/swaggenWidgetBridge';
import type { PageTemplate } from '@/lib/pageTemplates';
import { ARTBOARD_PRESETS, createEmptyDocument } from '@/lib/swaggenPresets';
import type { UIPage } from '@/types/project';

/**
 * Maps each `PAGE_TEMPLATES` starter to a gallery design template id for the
 * initial canvas (same gallery as the Pages editor).
 * Detail view is handled separately: blank 16:9 canvas + widget layers from the template.
 */
export const PAGE_TEMPLATE_LAYOUT_MAP: Record<string, string> = {
  'crud-list': 'slide-metrics',
  'create-form': 'slide-three-pillars',
  dashboard: 'slide-metrics',
  landing: 'fb-corporate',
  'api-test': 'x-breaking-news',
};

const PRESENTATION_PRESET =
  ARTBOARD_PRESETS.find(p => p.id === 'presentation') ?? ARTBOARD_PRESETS[0];

/** Build a `UIPage` from a Swaggen page template (name/path/description + visual canvas). */
export function buildUIPageFromPageTemplate(tpl: PageTemplate): UIPage {
  const meta = tpl.build();

  if (tpl.id === 'detail-view') {
    const base = createEmptyDocument(PRESENTATION_PRESET, meta.name);
    const doc = { ...base, background: '#f8fafc', name: meta.name };
    const maxZ = doc.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const widgets = meta.components.map((c, i) =>
      uiComponentToSwaggenElement(c, maxZ + i + 1),
    );
    return {
      id: uuid(),
      name: meta.name,
      path: meta.path,
      description: meta.description,
      components: [],
      editorMode: 'swaggen',
      swaggenDocument: { ...doc, elements: [...doc.elements, ...widgets] },
    };
  }

  const layoutTemplateId =
    PAGE_TEMPLATE_LAYOUT_MAP[tpl.id] ?? 'ig-purple-brand';
  const doc = buildSwaggenDocumentFromTemplateId(layoutTemplateId, meta.name);
  return {
    id: uuid(),
    name: meta.name,
    path: meta.path,
    description: meta.description,
    components: [],
    editorMode: 'swaggen',
    swaggenDocument: { ...doc, name: meta.name },
  };
}

/** New blank page with empty Swaggen canvas. */
export function buildBlankSwaggenPage(): UIPage {
  const doc = buildSwaggenDocumentFromTemplateId(
    'blank',
    'Untitled page',
  );
  return {
    id: uuid(),
    name: '',
    path: '',
    description: '',
    components: [],
    editorMode: 'swaggen',
    swaggenDocument: doc,
  };
}

/** Page from a layout gallery template (path derived from template id). */
export function buildUIPageFromSwaggenLayout(
  layoutTemplateId: string,
  documentName: string,
): UIPage {
  const doc = buildSwaggenDocumentFromTemplateId(layoutTemplateId, documentName);
  const p = `/p/${layoutTemplateId}`;
  return {
    id: uuid(),
    name: documentName,
    path: p,
    description: '',
    components: [],
    editorMode: 'swaggen',
    swaggenDocument: { ...doc, name: documentName },
  };
}

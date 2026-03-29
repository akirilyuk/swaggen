import type { SwaggenElement, SwaggenWidgetData } from '@/types/swaggenCanvas';
import type {
  UIComponent,
  UIComponentTemplate,
  SubmitAction,
  UIPage,
} from '@/types/project';

const compatibleTypes: Partial<Record<UIComponentTemplate, string[]>> = {
  'text-input': ['string', 'uuid'],
  'number-input': ['number'],
  checkbox: ['boolean'],
  'date-picker': ['date'],
  'text-area': ['string', 'json'],
  'select-dropdown': ['enum', 'string', 'boolean'],
};

const singleFieldTemplates: UIComponentTemplate[] = [
  'text-input',
  'number-input',
  'checkbox',
  'date-picker',
  'text-area',
  'select-dropdown',
];

const textInterpolationTemplates: UIComponentTemplate[] = [
  'header-text',
  'stat-card',
];

export function applyEntityToSwaggenLayer(
  el: SwaggenElement,
  entityId: string,
): SwaggenElement {
  if (el.kind === 'widget' && el.widget) {
    return {
      ...el,
      widget: { ...el.widget, entityId, visibleFields: [] },
    };
  }
  return {
    ...el,
    dataBinding: {
      entityId,
      visibleFields: el.dataBinding?.visibleFields ?? [],
    },
  };
}

/** Returns null if the field type is incompatible with a widget template. */
export function applyFieldToSwaggenLayer(
  el: SwaggenElement,
  droppedEntityId: string,
  droppedFieldName: string,
  droppedFieldType: string,
): SwaggenElement | null {
  if (el.kind === 'widget' && el.widget) {
    const w = el.widget;
    const tpl = w.template as UIComponentTemplate;
    const allowed = compatibleTypes[tpl];
    if (allowed && droppedFieldType && !allowed.includes(droppedFieldType)) {
      return null;
    }
    let visibleFields = [...(w.visibleFields || [])];
    if (singleFieldTemplates.includes(tpl)) {
      visibleFields = [droppedFieldName];
    } else if (!visibleFields.includes(droppedFieldName)) {
      visibleFields = [...visibleFields, droppedFieldName];
    }
    let title = w.title;
    if (textInterpolationTemplates.includes(tpl)) {
      const token = `{${droppedFieldName}}`;
      const t = w.title ?? '';
      const sep = t.length > 0 && !/\s$/.test(t) ? ' ' : '';
      title = t.length > 0 ? `${t}${sep}${token}` : token;
    }
    return {
      ...el,
      widget: {
        ...w,
        entityId: droppedEntityId,
        visibleFields,
        title,
      },
    };
  }

  if (el.kind === 'text' && el.text) {
    const token = `{${droppedFieldName}}`;
    const base = el.text.content ?? '';
    const sep =
      base.length > 0 && !/\s$/.test(base) ? ' ' : '';
    const content = base ? `${base}${sep}${token}` : token;
    const vf = new Set([
      ...(el.dataBinding?.visibleFields ?? []),
      droppedFieldName,
    ]);
    return {
      ...el,
      dataBinding: {
        entityId: droppedEntityId,
        visibleFields: [...vf],
      },
      text: { ...el.text, content },
    };
  }

  return el;
}

export function swaggenWidgetToUIComponent(el: SwaggenElement): UIComponent | null {
  if (el.kind !== 'widget' || !el.widget) return null;
  const w = el.widget;
  return {
    id: el.id,
    template: w.template as UIComponentTemplate,
    title: w.title,
    entityId: w.entityId,
    relationId: w.relationId,
    slot: '6-col',
    order: 0,
    position: { x: el.x, y: el.y },
    size: { width: el.width, height: el.height },
    visibleFields: w.visibleFields ?? [],
    linkedComponentIds: w.linkedComponentIds,
    linkedSubmitButtonId: w.linkedSubmitButtonId,
    submitAction: w.submitAction as SubmitAction | undefined,
    props: w.props ?? {},
  };
}

export function uiComponentToSwaggenWidgetData(c: UIComponent): SwaggenWidgetData {
  return {
    template: c.template,
    title: c.title,
    entityId: c.entityId,
    relationId: c.relationId,
    visibleFields: c.visibleFields,
    linkedComponentIds: c.linkedComponentIds,
    linkedSubmitButtonId: c.linkedSubmitButtonId,
    submitAction: c.submitAction as Record<string, unknown> | undefined,
    props: c.props,
  };
}

export function uiComponentToSwaggenElement(
  c: UIComponent,
  zIndex: number,
): SwaggenElement {
  return {
    id: c.id,
    kind: 'widget',
    name: c.title || c.template,
    x: c.position.x,
    y: c.position.y,
    width: c.size.width,
    height: c.size.height,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex,
    widget: uiComponentToSwaggenWidgetData(c),
  };
}

export function widgetElementsFromSwaggenDoc(
  elements: SwaggenElement[],
): UIComponent[] {
  return elements
    .filter((e): e is SwaggenElement & { kind: 'widget'; widget: SwaggenWidgetData } =>
      e.kind === 'widget' && Boolean(e.widget),
    )
    .map(e => swaggenWidgetToUIComponent(e)!);
}

const SNAP = 8;

function widgetStackingKey(el: SwaggenElement): string | null {
  if (el.kind !== 'widget' || !el.widget) return null;
  const w = el.widget;
  const x = Math.round(el.x / SNAP) * SNAP;
  const y = Math.round(el.y / SNAP) * SNAP;
  const bw = Math.round(el.width / SNAP) * SNAP;
  const bh = Math.round(el.height / SNAP) * SNAP;
  return `${w.template}:${x}:${y}:${bw}:${bh}`;
}

/**
 * Drop duplicate layer ids (keep first), then drop stacked duplicate **widgets**
 * that share the same template and snapped bounds — keeps the highest z-index.
 */
export function dedupeSwaggenElements(elements: SwaggenElement[]): SwaggenElement[] {
  const seenIds = new Set<string>();
  let out = elements.filter(el => {
    if (seenIds.has(el.id)) return false;
    seenIds.add(el.id);
    return true;
  });

  const winners = new Map<string, SwaggenElement>();
  for (const el of out) {
    const key = widgetStackingKey(el);
    if (!key) continue;
    const prev = winners.get(key);
    if (!prev || el.zIndex > prev.zIndex) winners.set(key, el);
  }
  const winningWidgetIds = new Set(
    [...winners.values()].map(e => e.id),
  );
  out = out.filter(el => {
    const key = widgetStackingKey(el);
    if (!key) return true;
    return winningWidgetIds.has(el.id);
  });

  return out;
}

/**
 * Canonicalize Swaggen canvas page UI: dedupe layers (ids + stacked widgets), append orphan
 * `page.components` as widget layers only when their id is not on the artboard,
 * then clear `page.components` so widgets have a single source of truth on the canvas.
 */
export function mergeSwaggenPageUiState(page: UIPage): UIPage {
  if (!page.swaggenDocument) return page;

  let elements = dedupeSwaggenElements(page.swaggenDocument.elements);

  const idsOnBoard = new Set(elements.map(e => e.id));
  const comps = page.components ?? [];
  let maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);

  for (const c of comps) {
    if (idsOnBoard.has(c.id)) continue;
    maxZ += 1;
    elements.push(uiComponentToSwaggenElement(c, maxZ));
    idsOnBoard.add(c.id);
  }

  elements = dedupeSwaggenElements(elements);

  return {
    ...page,
    components: [],
    swaggenDocument: {
      ...page.swaggenDocument,
      elements,
    },
  };
}

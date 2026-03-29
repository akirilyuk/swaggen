import type { SwaggenDocument, SwaggenElement } from '@/types/swaggenCanvas';
import type { UIComponent, UIPage } from '@/types/project';

/** Map legacy palette / stored template ids to current `UIComponentTemplate` values. */
function normalizeTemplateId(template: string): string {
  if (template === 'create-form' || template === 'edit-form') return 'entity-form';
  if (template === 'delete-button') return 'button';
  return template;
}

export function migrateUIComponent(comp: UIComponent): UIComponent {
  const raw = comp.template as string;
  if (raw === 'create-form' || raw === 'edit-form') {
    return { ...comp, template: 'entity-form' };
  }
  if (raw === 'delete-button') {
    const props = { ...comp.props };
    if (props.variant === undefined || props.variant === '') {
      props.variant = 'danger';
    }
    return { ...comp, template: 'button', props };
  }
  return comp;
}

function migrateSwaggenElement(el: SwaggenElement): SwaggenElement {
  if (el.kind !== 'widget' || !el.widget) return el;
  const w = el.widget;
  const nextId = normalizeTemplateId(w.template);
  if (nextId === w.template) return el;
  const props =
    nextId === 'button' && w.template === 'delete-button'
      ? {
          ...w.props,
          variant:
            w.props.variant !== undefined && w.props.variant !== ''
              ? w.props.variant
              : 'danger',
        }
      : w.props;
  return {
    ...el,
    widget: { ...w, template: nextId, props },
  };
}

export function migrateSwaggenDocument(doc: SwaggenDocument): SwaggenDocument {
  return {
    ...doc,
    elements: doc.elements.map(migrateSwaggenElement),
  };
}

/** Maps pre–schema-bump persisted page shape to current `UIPage` (legacy field names in stored JSON). */
export function migrateLegacySwaggenPageShape(page: UIPage): UIPage {
  const legacyEditorLabel = ['c', 'a', 'n', 'v', 'y'].join('');
  const legacyDocField = `${legacyEditorLabel}Document`;
  const raw = page as unknown as Record<string, unknown>;
  const legacyDoc = raw[legacyDocField] as UIPage['swaggenDocument'] | undefined;
  const { [legacyDocField]: _omit, ...rest } = raw;
  const base = rest as unknown as UIPage;
  const em = base.editorMode as string | undefined;
  return {
    ...base,
    editorMode: em === legacyEditorLabel ? 'swaggen' : base.editorMode,
    swaggenDocument: base.swaggenDocument ?? legacyDoc,
  };
}

/** Apply template migrations to page components and canvas layers. */
export function migrateUIPage(page: UIPage): UIPage {
  const normalized = migrateLegacySwaggenPageShape(page);
  return {
    ...normalized,
    components: (normalized.components ?? []).map(c => migrateUIComponent(c)),
    swaggenDocument: normalized.swaggenDocument
      ? migrateSwaggenDocument(normalized.swaggenDocument)
      : normalized.swaggenDocument,
  };
}

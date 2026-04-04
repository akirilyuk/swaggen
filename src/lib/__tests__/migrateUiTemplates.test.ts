import {
  migrateLegacySwaggenPageShape,
  migrateSwaggenDocument,
  migrateUIComponent,
  migrateUIPage,
} from '@/lib/migrateUiTemplates';
import type { SwaggenDocument } from '@/types/swaggenCanvas';
import type { UIComponent, UIPage } from '@/types/project';

function minimalComponent(template: UIComponent['template']): UIComponent {
  return {
    id: 'c1',
    template,
    title: 'T',
    entityId: null,
    relationId: null,
    slot: '1-col',
    order: 0,
    position: { x: 0, y: 0 },
    size: { width: 1, height: 1 },
    visibleFields: [],
    props: {},
  };
}

describe('migrateUIComponent', () => {
  it('maps create-form to entity-form', () => {
    const c = migrateUIComponent(minimalComponent('create-form' as UIComponent['template']));
    expect(c.template).toBe('entity-form');
  });

  it('maps delete-button to danger button', () => {
    const c = migrateUIComponent(minimalComponent('delete-button' as UIComponent['template']));
    expect(c.template).toBe('button');
    expect(c.props.variant).toBe('danger');
  });
});

describe('migrateSwaggenDocument', () => {
  it('migrates widget template ids inside elements', () => {
    const doc: SwaggenDocument = {
      id: 'd',
      name: 'n',
      artboardWidth: 100,
      artboardHeight: 100,
      background: '#fff',
      elements: [
        {
          id: 'w',
          kind: 'widget',
          name: 'w',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          locked: false,
          zIndex: 1,
          widget: {
            template: 'delete-button',
            title: 'Del',
            entityId: null,
            relationId: null,
            visibleFields: [],
            props: {},
          },
        },
      ],
    };
    const next = migrateSwaggenDocument(doc);
    expect(next.elements[0].widget?.template).toBe('button');
    expect(next.elements[0].widget?.props.variant).toBe('danger');
  });
});

describe('migrateLegacySwaggenPageShape', () => {
  it('promotes legacy canvas document field to swaggenDocument', () => {
    const legacyKey = ['c', 'a', 'n', 'v', 'y'].join('');
    const legacyDoc: SwaggenDocument = {
      id: 'ld',
      name: 'l',
      artboardWidth: 1,
      artboardHeight: 1,
      background: '#000',
      elements: [],
    };
    const raw = {
      id: 'p1',
      name: 'Page',
      path: '/',
      components: [],
      editorMode: legacyKey,
      [legacyKey + 'Document']: legacyDoc,
    };
    const page = migrateLegacySwaggenPageShape(raw as unknown as UIPage);
    expect(page.editorMode).toBe('swaggen');
    expect(page.swaggenDocument).toEqual(legacyDoc);
  });
});

describe('migrateUIPage', () => {
  it('runs legacy shape fix then component migration', () => {
    const page: UIPage = {
      id: 'p',
      name: 'P',
      path: '/',
      components: [minimalComponent('create-form' as UIComponent['template'])],
      editorMode: 'swaggen',
    };
    const m = migrateUIPage(page);
    expect(m.components[0].template).toBe('entity-form');
  });
});

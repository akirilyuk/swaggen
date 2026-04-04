jest.mock('uuid', () => {
  let n = 0;
  return {
    v4: () =>
      `00000000-0000-4000-8000-${(100000 + n++).toString(16).slice(-12).padStart(12, '0')}`,
  };
});

import { PAGE_TEMPLATES } from '@/lib/pageTemplates';
import {
  PAGE_TEMPLATE_LAYOUT_MAP,
  buildBlankSwaggenPage,
  buildUIPageFromPageTemplate,
  buildUIPageFromSwaggenLayout,
} from '@/lib/pageAppStarters';

describe('PAGE_TEMPLATE_LAYOUT_MAP', () => {
  it('has a layout id for every app starter except detail-view', () => {
    for (const tpl of PAGE_TEMPLATES) {
      if (tpl.id === 'detail-view') {
        expect(PAGE_TEMPLATE_LAYOUT_MAP[tpl.id]).toBeUndefined();
      } else {
        expect(PAGE_TEMPLATE_LAYOUT_MAP[tpl.id]).toBeTruthy();
      }
    }
  });
});

describe('buildUIPageFromPageTemplate', () => {
  it('produces swaggen pages with metadata from each starter', () => {
    for (const tpl of PAGE_TEMPLATES) {
      const page = buildUIPageFromPageTemplate(tpl);
      expect(page.editorMode).toBe('swaggen');
      expect(page.swaggenDocument).toBeTruthy();
      expect(page.components).toEqual([]);
      const meta = tpl.build();
      expect(page.path).toBe(meta.path);
      expect(page.description).toBe(meta.description);
    }
  });

  it('detail-view merges freeform components into canvas elements', () => {
    const detail = PAGE_TEMPLATES.find(t => t.id === 'detail-view')!;
    const page = buildUIPageFromPageTemplate(detail);
    const elCount = page.swaggenDocument?.elements.length ?? 0;
    const meta = detail.build();
    expect(elCount).toBeGreaterThanOrEqual(meta.components.length);
  });

  it('dashboard canvas matches template document name', () => {
    const dash = PAGE_TEMPLATES.find(t => t.id === 'dashboard')!;
    const page = buildUIPageFromPageTemplate(dash);
    expect(page.swaggenDocument?.name).toBe('Dashboard');
    expect(page.name).toBe('Dashboard');
  });
});

describe('buildBlankSwaggenPage', () => {
  it('returns an empty-path swaggen page with a document', () => {
    const page = buildBlankSwaggenPage();
    expect(page.editorMode).toBe('swaggen');
    expect(page.path).toBe('');
    expect(page.swaggenDocument).toBeTruthy();
    expect(page.swaggenDocument?.elements.length).toBeGreaterThanOrEqual(0);
  });
});

describe('buildUIPageFromSwaggenLayout', () => {
  it('uses /p/{layoutId} path pattern', () => {
    const page = buildUIPageFromSwaggenLayout('blank', 'My layout page');
    expect(page.path).toBe('/p/blank');
    expect(page.name).toBe('My layout page');
    expect(page.editorMode).toBe('swaggen');
  });
});

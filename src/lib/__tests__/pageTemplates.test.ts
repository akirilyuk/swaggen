jest.mock('uuid', () => {
  let n = 0;
  return {
    v4: () =>
      `00000000-0000-4000-8000-${(100000 + n++).toString(16).slice(-12).padStart(12, '0')}`,
  };
});

import { PAGE_TEMPLATES } from '@/lib/pageTemplates';

describe('PAGE_TEMPLATES', () => {
  it('exports a non-empty list with unique ids', () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    const ids = PAGE_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PAGE_TEMPLATES.map(t => [t.id, t] as const))(
    '%s build() returns a UIPage with path and ordered components',
    (_id, tpl) => {
      const page = tpl.build();
      expect(page.id).toBeTruthy();
      expect(page.name.trim().length).toBeGreaterThan(0);
      expect(page.path).toMatch(/^\//);
      expect(Array.isArray(page.components)).toBe(true);
      expect(page.components.length).toBeGreaterThan(0);
      page.components.forEach((c, i) => {
        expect(c.order).toBe(i);
        expect(c.template).toBeTruthy();
        expect(c.id).toBeTruthy();
      });
    },
  );

  it('maps known starter paths and key widgets', () => {
    const byId = Object.fromEntries(PAGE_TEMPLATES.map(t => [t.id, t]));

    expect(byId.dashboard!.build().path).toBe('/dashboard');
    expect(byId['crud-list']!.build().path).toBe('/list');
    expect(byId['create-form']!.build().path).toBe('/create');
    expect(byId['detail-view']!.build().path).toBe('/detail/[id]');
    expect(byId.landing!.build().path).toBe('/');
    expect(byId['api-test']!.build().path).toBe('/api-test');

    const crud = byId['crud-list']!.build();
    const templates = crud.components.map(c => c.template);
    expect(templates).toContain('list-table');
    expect(templates).toContain('response-view');
    const rv = crud.components.find(c => c.template === 'response-view');
    const btn = crud.components.find(
      c => c.template === 'button' && c.title === 'Create',
    );
    expect(rv?.linkedSubmitButtonId).toBe(btn?.id);
    expect(btn?.submitAction?.responseViewId).toBe(rv?.id);
  });

  it('create-form includes textarea and linked response flow', () => {
    const page = PAGE_TEMPLATES.find(t => t.id === 'create-form')!.build();
    expect(page.components.some(c => c.template === 'text-area')).toBe(true);
    const rv = page.components.find(c => c.template === 'response-view');
    const submit = page.components.find(c => c.title === 'Submit');
    expect(rv?.linkedSubmitButtonId).toBe(submit?.id);
  });

  it('dashboard has four stat cards and a list table', () => {
    const page = PAGE_TEMPLATES.find(t => t.id === 'dashboard')!.build();
    expect(page.components.filter(c => c.template === 'stat-card')).toHaveLength(4);
    expect(page.components.some(c => c.template === 'list-table')).toBe(true);
  });
});

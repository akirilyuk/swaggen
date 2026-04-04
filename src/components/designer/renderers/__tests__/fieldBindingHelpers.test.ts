import { fieldBindingHelpers, readProp } from '@/components/designer/renderers/types';
import type { UIComponent } from '@/types/project';

function minimalComponent(props: Record<string, unknown> = {}): UIComponent {
  return {
    id: 'c1',
    template: 'paragraph',
    title: 'P',
    entityId: null,
    relationId: null,
    slot: '1-col',
    order: 0,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 40 },
    visibleFields: [],
    props,
  };
}

describe('fieldBindingHelpers', () => {
  it('builds token lists and examples for interpolation', () => {
    const h = fieldBindingHelpers(['name', 'email']);
    expect(h.fieldTokens).toEqual(['{name}', '{email}']);
    expect(h.fieldTokensExample).toBe('{name}, {email}');
    expect(h.placeholderExample).toMatch(/\{name\}.*\{email\}/);
    expect(h.defaultFallback).toBe('{name} · {email}');
  });

  it('uses a shorter placeholder example for a single field', () => {
    const h = fieldBindingHelpers(['title']);
    expect(h.placeholderExample).toContain('{title}');
  });

  it('readProp returns fallback when the key is absent', () => {
    const c = minimalComponent();
    expect(readProp(c, 'displayMode', 'list')).toBe('list');
  });

  it('readProp returns stored prop value', () => {
    const c = minimalComponent({ displayMode: 'select' });
    expect(readProp(c, 'displayMode', 'list')).toBe('select');
  });
});

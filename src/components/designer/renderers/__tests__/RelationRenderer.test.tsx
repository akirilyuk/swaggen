/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { RelationRenderer } from '@/components/designer/renderers/RelationRenderer';
import type { Entity, UIComponent } from '@/types/project';

function baseComponent(overrides: Partial<UIComponent> = {}): UIComponent {
  return {
    id: 'comp-1',
    template: 'relation',
    title: 'Related items',
    entityId: 'e-post',
    relationId: 'rel-1',
    slot: '1-col',
    order: 0,
    position: { x: 0, y: 0 },
    size: { width: 320, height: 200 },
    visibleFields: [],
    props: {},
    ...overrides,
  };
}

const stubEntities: Entity[] = [
  {
    id: 'e-post',
    name: 'Post',
    fields: [],
    middlewareBindings: [],
  },
];

describe('RelationRenderer (relation UI)', () => {
  it('renders list preview by default', () => {
    render(
      <RelationRenderer
        component={baseComponent()}
        entities={stubEntities}
        siblingComponents={[]}
        editable={false}
      />,
    );

    expect(screen.getByText('Related items')).toBeInTheDocument();
    expect(
      screen.getByText(/Related record preview \(bind a relation in the designer\)/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders a select when displayMode is select', () => {
    render(
      <RelationRenderer
        component={baseComponent({
          props: { displayMode: 'select' },
        })}
        entities={stubEntities}
        siblingComponents={[]}
        editable={false}
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Select related item/i })).toBeInTheDocument();
  });
});

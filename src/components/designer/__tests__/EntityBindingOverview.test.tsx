/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { EntityBindingOverview } from '@/components/designer/EntityBindingOverview';
import type { Entity } from '@/types/project';
import type { SwaggenElement } from '@/types/swaggenCanvas';

jest.mock('@/components/designer/EntityFieldPreview', () => ({
  EntityFieldPreview: () => <div data-testid="entity-field-preview" />,
}));

describe('EntityBindingOverview (canvas → entity linking)', () => {
  const userEntity: Entity = {
    id: 'ent-user',
    name: 'User',
    fields: [{ name: 'email', type: 'string', required: true }],
    middlewareBindings: [],
  };

  it('shows guidance when no layers are bound to an entity', () => {
    render(<EntityBindingOverview elements={[]} entities={[userEntity]} />);

    expect(screen.getByText(/No entity links on layers yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Entity → layer map/i)).not.toBeInTheDocument();
  });

  it('lists widget layers bound to an entity with field summary', () => {
    const elements: SwaggenElement[] = [
      {
        id: 'layer-1',
        kind: 'widget',
        name: 'widget-a',
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 1,
        widget: {
          template: 'stat-card',
          title: 'Profile card',
          entityId: 'ent-user',
          relationId: null,
          visibleFields: ['email'],
          props: {},
        },
      },
    ];

    render(<EntityBindingOverview elements={elements} entities={[userEntity]} />);

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText(/Profile card/i)).toBeInTheDocument();
    expect(screen.getByText(/fields:/i)).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByTestId('entity-field-preview')).toBeInTheDocument();
    expect(screen.getByText('1 link')).toBeInTheDocument();
  });

  it('treats dataBinding on text/image layers as entity links', () => {
    const elements: SwaggenElement[] = [
      {
        id: 'txt-1',
        kind: 'text',
        name: 'headline-text',
        x: 0,
        y: 0,
        width: 200,
        height: 24,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 0,
        text: {
          content: 'Hello',
          fontFamily: 'sans-serif',
          fontSize: 16,
          fontWeight: 400,
          color: '#000',
          textAlign: 'left',
          lineHeight: 1.2,
        },
        dataBinding: {
          entityId: 'ent-user',
          visibleFields: [],
        },
      },
    ];

    render(<EntityBindingOverview elements={elements} entities={[userEntity]} />);

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText(/headline text/i)).toBeInTheDocument();
    expect(screen.getByText(/all fields/i)).toBeInTheDocument();
  });

  it('shows Unknown entity when the bound id is not in the project', () => {
    const elements: SwaggenElement[] = [
      {
        id: 'w-1',
        kind: 'widget',
        name: 'orphan',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 0,
        widget: {
          template: 'detail-card',
          title: 'Card',
          entityId: 'missing-id',
          relationId: null,
          visibleFields: [],
          props: {},
        },
      },
    ];

    render(<EntityBindingOverview elements={elements} entities={[userEntity]} />);

    expect(screen.getByText('Unknown entity')).toBeInTheDocument();
    expect(screen.queryByTestId('entity-field-preview')).not.toBeInTheDocument();
  });

  it('calls onRemoveLayer with the element id when remove is pressed', () => {
    const onRemoveLayer = jest.fn();
    const elements: SwaggenElement[] = [
      {
        id: 'to-remove',
        kind: 'widget',
        name: 'x',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 0,
        widget: {
          template: 'card',
          title: 'My card',
          entityId: 'ent-user',
          relationId: null,
          visibleFields: [],
          props: {},
        },
      },
    ];

    render(
      <EntityBindingOverview
        elements={elements}
        entities={[userEntity]}
        onRemoveLayer={onRemoveLayer}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Remove layer/i }));
    expect(onRemoveLayer).toHaveBeenCalledWith('to-remove');
  });
});

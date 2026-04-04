import {
  resolveFieldForInput,
  resolveFieldForOutput,
} from '@/lib/entityFieldResolve';
import type { Entity } from '@/types/project';

const entities: Entity[] = [
  {
    id: 'e1',
    name: 'Item',
    fields: [
      { name: 'title', type: 'string', required: true, defaultValue: 'Default title' },
      { name: 'note', type: 'string', required: false },
    ],
    middlewareBindings: [],
  },
];

describe('resolveFieldForOutput', () => {
  it('prefers non-empty runtime value', () => {
    expect(resolveFieldForOutput(entities, 'e1', 'title', 'Live')).toBe('Live');
  });

  it('uses schema default when runtime is empty', () => {
    expect(resolveFieldForOutput(entities, 'e1', 'title', '')).toBe('Default title');
  });

  it('falls back to type preview when no default', () => {
    expect(resolveFieldForOutput(entities, 'e1', 'note', '')).toBe('Sample text');
  });

  it('returns empty string when entity or field is missing', () => {
    expect(resolveFieldForOutput(entities, 'missing', 'title', '')).toBe('');
    expect(resolveFieldForOutput(entities, 'e1', 'nope', '')).toBe('');
  });
});

describe('resolveFieldForInput', () => {
  it('prefers non-empty runtime value', () => {
    expect(resolveFieldForInput(entities, 'e1', 'title', 'Edited')).toBe('Edited');
  });

  it('uses default when runtime empty', () => {
    expect(resolveFieldForInput(entities, 'e1', 'title', '')).toBe('Default title');
  });

  it('returns empty when no default (no preview for inputs)', () => {
    expect(resolveFieldForInput(entities, 'e1', 'note', '')).toBe('');
  });
});

import { previewValueForField } from '@/lib/entityFieldPreview';
import type { EntityField } from '@/types/project';

function field(partial: Partial<EntityField> & Pick<EntityField, 'name' | 'type' | 'required'>): EntityField {
  return {...partial} as EntityField;
}

describe('previewValueForField', () => {
  it.each<[EntityField['type'], string]>([
    ['string', 'Sample text'],
    ['number', '42'],
    ['boolean', 'true'],
    ['date', '2026-03-29'],
    ['uuid', '550e8400-e29b-41d4-a716-446655440000'],
    ['json', '{"key": "value"}'],
  ])('returns stable sample for %s', (type, expected) => {
    expect(previewValueForField(field({ name: 'x', type, required: false }))).toBe(
      expected,
    );
  });

  it('uses first enum value when present', () => {
    expect(
      previewValueForField(
        field({
          name: 'status',
          type: 'enum',
          required: true,
          enumValues: ['open', 'closed'],
        }),
      ),
    ).toBe('open');
  });

  it('falls back for enum without values', () => {
    expect(
      previewValueForField(field({ name: 'e', type: 'enum', required: false })),
    ).toBe('option_a');
  });
});

import type { EntityField } from '@/types/project';

/** Representative sample for design-time previews (stable, not random). */
export function previewValueForField(field: EntityField): string {
  switch (field.type) {
    case 'string':
      return 'Sample text';
    case 'number':
      return '42';
    case 'boolean':
      return 'true';
    case 'date':
      return '2026-03-29';
    case 'enum':
      return field.enumValues?.[0] ?? 'option_a';
    case 'uuid':
      return '550e8400-e29b-41d4-a716-446655440000';
    case 'json':
      return '{"key": "value"}';
    default:
      return '—';
  }
}

import { previewValueForField } from '@/lib/entityFieldPreview';
import type { Entity, EntityField } from '@/types/project';

function findField(
  entities: Entity[],
  entityId: string,
  fieldName: string,
): EntityField | undefined {
  return entities
    .find(e => e.id === entityId)
    ?.fields.find(f => f.name === fieldName);
}

/**
 * Read-only / “output” display: runtime first, then schema default, then a
 * stable type-based sample so new entity fields show in the canvas and widgets.
 */
export function resolveFieldForOutput(
  entities: Entity[],
  entityId: string,
  fieldName: string,
  runtimeValue: string,
): string {
  if (runtimeValue !== '') return runtimeValue;
  const field = findField(entities, entityId, fieldName);
  if (!field) return '';
  if (field.defaultValue !== undefined && field.defaultValue !== '') {
    return field.defaultValue;
  }
  return previewValueForField(field);
}

/**
 * Bound inputs: runtime first, then optional schema default only (no random
 * preview) so users can still clear a field.
 */
export function resolveFieldForInput(
  entities: Entity[],
  entityId: string,
  fieldName: string,
  runtimeValue: string,
): string {
  if (runtimeValue !== '') return runtimeValue;
  const field = findField(entities, entityId, fieldName);
  if (field?.defaultValue !== undefined && field.defaultValue !== '') {
    return field.defaultValue;
  }
  return '';
}

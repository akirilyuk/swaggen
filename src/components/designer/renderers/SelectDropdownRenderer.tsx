import { resolveFieldForInput } from '@/lib/entityFieldResolve';

import { usePageRuntime } from '../PageRuntimeContext';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'placeholder',
    label: 'Placeholder',
    type: 'text',
    placeholder: 'Select option…',
  },
  { key: 'required', label: 'Required', type: 'toggle', defaultValue: false },
];

export function SelectDropdownRenderer({
  component,
  entities,
  editable,
  onTitleChange,
  onValueChange,
}: BaseRendererProps) {
  const { getValue, setValue } = usePageRuntime();
  const title = component.title || '';
  const entityId = component.entityId;
  const primaryField = component.visibleFields?.[0];
  const hasBoundField = !!entityId && !!primaryField;
  const savedValue = readProp<string>(component, 'value', '');
  const rawRuntime = hasBoundField
    ? (getValue(entityId, primaryField) ?? '')
    : savedValue;
  const runtimeValue =
    hasBoundField && entityId && primaryField
      ? resolveFieldForInput(entities, entityId, primaryField, rawRuntime)
      : rawRuntime;

  const linkedEntity = entityId ? entities.find(e => e.id === entityId) : null;
  const linkedField =
    linkedEntity && primaryField
      ? linkedEntity.fields.find(f => f.name === primaryField)
      : null;

  let options: { value: string; label: string }[] = [];
  if (linkedField) {
    if (linkedField.type === 'enum' && linkedField.enumValues?.length) {
      options = linkedField.enumValues.map(v => ({ value: v, label: v }));
    } else if (linkedField.type === 'boolean') {
      options = [
        { value: 'true', label: 'true' },
        { value: 'false', label: 'false' },
      ];
    }
  }

  const customPlaceholder = readProp<string>(component, 'placeholder', '');
  const isRequired = readProp<boolean>(component, 'required', false);

  return (
    <div>
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
      />
      <select
        value={runtimeValue}
        onChange={e => {
          if (hasBoundField) {
            setValue(entityId, primaryField, e.target.value);
          }
          onValueChange?.(e.target.value);
        }}
        required={isRequired}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300"
      >
        {!runtimeValue && (
          <option value="">{hasBoundField ? '— Select —' : (customPlaceholder || 'Select option...')}</option>
        )}
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

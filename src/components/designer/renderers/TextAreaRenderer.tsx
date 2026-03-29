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
    placeholder: 'Placeholder text…',
  },
  { key: 'rows', label: 'Rows', type: 'number', defaultValue: 3 },
  { key: 'required', label: 'Required', type: 'toggle', defaultValue: false },
];

export function TextAreaRenderer({
  component,
  editable,
  onTitleChange,
  onValueChange,
  entities,
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
  const customPlaceholder = readProp<string>(component, 'placeholder', '');
  const rowCount = readProp<number>(component, 'rows', 3);
  const isRequired = readProp<boolean>(component, 'required', false);

  return (
    <div>
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
      />
      <textarea
        rows={rowCount}
        value={runtimeValue}
        onChange={e => {
          if (hasBoundField) {
            setValue(entityId, primaryField, e.target.value);
          }
          onValueChange?.(e.target.value);
        }}
        placeholder={hasBoundField ? '' : (customPlaceholder || `Type ${title.toLowerCase() || 'text'} here...`)}
        required={isRequired}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 resize-none"
      />
    </div>
  );
}

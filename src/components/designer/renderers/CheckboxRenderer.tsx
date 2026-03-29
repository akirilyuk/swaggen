import { resolveFieldForInput } from '@/lib/entityFieldResolve';

import { usePageRuntime } from '../PageRuntimeContext';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  { key: 'required', label: 'Required', type: 'toggle', defaultValue: false },
];

export function CheckboxRenderer({
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
  const savedValue = readProp<string>(component, 'value', 'false');
  const rawRuntime = hasBoundField
    ? (getValue(entityId, primaryField) ?? '')
    : savedValue;
  const runtimeValue =
    hasBoundField && entityId && primaryField
      ? resolveFieldForInput(entities, entityId, primaryField, rawRuntime)
      : rawRuntime;
  const isChecked = runtimeValue === 'true';
  const isRequired = readProp<boolean>(component, 'required', false);

  return (
    <div className="flex items-center gap-2 py-3 px-0.5">
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-zinc-300"
        id={component.id}
        checked={isChecked}
        onChange={e => {
          const newValue = String(e.target.checked);
          if (hasBoundField) {
            setValue(entityId, primaryField, newValue);
          }
          onValueChange?.(newValue);
        }}
        required={isRequired}
      />
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      />
    </div>
  );
}

import { Card } from '@/components/ui';
import { resolveFieldForOutput } from '@/lib/entityFieldResolve';

import { usePageRuntime } from '../PageRuntimeContext';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'columns',
    label: 'Layout Columns',
    type: 'select',
    options: [
      { value: '1', label: '1 Column' },
      { value: '2', label: '2 Columns' },
    ],
    defaultValue: '1',
  },
];

export function DetailCardRenderer({
  component,
  editable,
  onTitleChange,
  entities,
}: BaseRendererProps) {
  const { getValue } = usePageRuntime();
  const title = component.title || '';
  const entityId = component.entityId;
  const fields =
    component.visibleFields.length > 0 ? component.visibleFields : [];
  const columns = readProp<string>(component, 'columns', '1');
  const gridClass =
    columns === '2' ? 'grid grid-cols-2 gap-x-8 gap-y-4' : 'space-y-4';

  const getFieldValue = (fieldName: string): string => {
    if (!entityId) return '';
    const raw = getValue(entityId, fieldName);
    return resolveFieldForOutput(entities, entityId, fieldName, raw);
  };

  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 p-6">
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4"
      />
      {fields.length > 0 ? (
        <div className={gridClass}>
          {fields.map(f => {
            const val = getFieldValue(f);
            return (
              <div
                key={f}
                className="flex flex-col gap-1 border-b border-zinc-50 dark:border-zinc-800/50 pb-3 pt-0.5"
              >
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {f}
                </span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                  {val || <span className="opacity-30 italic">{`{${f}}`}</span>}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 italic">
          No fields linked — bind an entity to show data
        </p>
      )}
    </Card>
  );
}

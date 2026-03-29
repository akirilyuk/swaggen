import React from 'react';

import { Card, Input } from '@/components/ui';
import { resolveFieldForInput } from '@/lib/entityFieldResolve';

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

export function FormRenderer({
  component,
  editable,
  onTitleChange,
  entities,
}: BaseRendererProps) {
  const { getValue, setValue } = usePageRuntime();
  const title = component.title || '';
  const entityId = component.entityId;
  const formFields =
    component.visibleFields.length > 0 ? component.visibleFields : [];
  const columns = readProp<string>(component, 'columns', '1');
  const gridClass =
    columns === '2' ? 'grid grid-cols-2 gap-x-6 gap-y-4' : 'space-y-4';

  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 p-6">
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4"
      />
      {formFields.length > 0 ? (
        <div className={gridClass}>
          {formFields.map(f => (
            <Input
              key={f}
              label={f}
              placeholder={`Enter ${f}...`}
              value={
                entityId
                  ? resolveFieldForInput(
                      entities,
                      entityId,
                      f,
                      getValue(entityId, f) ?? '',
                    )
                  : ''
              }
              onChange={
                entityId
                  ? (e: React.ChangeEvent<HTMLInputElement>) =>
                      setValue(entityId, f, e.target.value)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 italic">
          No fields linked — bind an entity to show the entity form fields
        </p>
      )}
    </Card>
  );
}

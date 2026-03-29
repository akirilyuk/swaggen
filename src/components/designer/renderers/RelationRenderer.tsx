import { Card, Select } from '@/components/ui';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'displayMode',
    label: 'Display as',
    type: 'select',
    options: [
      { value: 'list', label: 'List (many related records)' },
      { value: 'select', label: 'Dropdown (pick one related record)' },
    ],
    defaultValue: 'list',
  },
];

export function RelationRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const title = component.title || '';
  const mode = readProp<string>(component, 'displayMode', 'list');

  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 p-6">
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3"
      />
      {mode === 'select' ? (
        <Select options={[{ value: '', label: 'Select related item…' }]} />
      ) : (
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="rounded-md border border-dashed border-zinc-200 px-3 py-2 dark:border-zinc-700">
            Related record preview (bind a relation in the designer)
          </li>
          <li className="rounded-md border border-dashed border-zinc-200 px-3 py-2 dark:border-zinc-700 opacity-70">
            …
          </li>
        </ul>
      )}
    </Card>
  );
}

import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'listType',
    label: 'List Type',
    type: 'select',
    options: [
      { value: 'unordered', label: 'Bullet Points' },
      { value: 'ordered', label: 'Numbered' },
      { value: 'none', label: 'No Markers' },
    ],
    defaultValue: 'unordered',
  },
  {
    key: 'items',
    label: 'Items (one per line)',
    type: 'text',
    placeholder: 'Item 1\nItem 2\nItem 3',
  },
];

export function ListRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const title = component.title || '';
  const listType = readProp<string>(component, 'listType', 'unordered');
  const itemsText = readProp<string>(component, 'items', 'Item 1\nItem 2\nItem 3');
  const items = itemsText.split('\n').filter(Boolean);

  const listClasses: Record<string, string> = {
    unordered: 'list-disc',
    ordered: 'list-decimal',
    none: 'list-none',
  };

  const ListTag = listType === 'ordered' ? 'ol' : 'ul';

  return (
    <div>
      {(title || editable) && (
        <div className="mb-2">
          {editable ? (
            <EditableTitle
              value={title}
              editable={editable}
              onChange={onTitleChange}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              placeholder="List title (optional)"
            />
          ) : title ? (
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h4>
          ) : null}
        </div>
      )}
      <ListTag className={`${listClasses[listType]} pl-6 space-y-2 text-zinc-600 dark:text-zinc-400`}>
        {items.map((item, idx) => (
          <li key={idx} className="text-sm">{item}</li>
        ))}
      </ListTag>
    </div>
  );
}

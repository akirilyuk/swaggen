import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'padding',
    label: 'Padding',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' },
    ],
    defaultValue: 'md',
  },
  {
    key: 'shadow',
    label: 'Shadow',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' },
    ],
    defaultValue: 'sm',
  },
  {
    key: 'border',
    label: 'Border',
    type: 'toggle',
    defaultValue: true,
  },
];

export function CardRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const title = component.title || '';
  const padding = readProp<string>(component, 'padding', 'md');
  const shadow = readProp<string>(component, 'shadow', 'sm');
  const border = readProp<boolean>(component, 'border', true);

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-8',
  };

  const shadowClasses: Record<string, string> = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-xl ${paddingClasses[padding]} ${shadowClasses[shadow]} ${border ? 'border border-zinc-200 dark:border-zinc-700' : ''}`}
    >
      {(title || editable) && (
        <div className="mb-2">
          {editable ? (
            <EditableTitle
              value={title}
              editable={editable}
              onChange={onTitleChange}
              className="text-lg font-semibold text-zinc-900 dark:text-white"
              placeholder="Card title (optional)"
            />
          ) : title ? (
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
          ) : null}
        </div>
      )}
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Card content area
      </div>
    </div>
  );
}

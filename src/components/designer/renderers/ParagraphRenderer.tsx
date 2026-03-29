import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'align',
    label: 'Alignment',
    type: 'select',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
      { value: 'justify', label: 'Justify' },
    ],
    defaultValue: 'left',
  },
  {
    key: 'size',
    label: 'Size',
    type: 'select',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'base', label: 'Normal' },
      { value: 'lg', label: 'Large' },
    ],
    defaultValue: 'base',
  },
];

export function ParagraphRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const text = component.title || 'Enter paragraph text...';
  const align = readProp<string>(component, 'align', 'left');
  const size = readProp<string>(component, 'size', 'base');

  const sizeClasses: Record<string, string> = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  if (editable) {
    return (
      <div className="px-1 py-2">
        <EditableTitle
          value={text}
          editable={editable}
          onChange={onTitleChange}
          className={`${sizeClasses[size]} ${alignClasses[align]} text-zinc-600 dark:text-zinc-400 w-full`}
          placeholder="Enter paragraph text..."
        />
      </div>
    );
  }

  return (
    <p
      className={`${sizeClasses[size]} ${alignClasses[align]} text-zinc-600 dark:text-zinc-400 px-1 py-2`}
    >
      {text}
    </p>
  );
}

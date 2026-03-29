import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'variant',
    label: 'Variant',
    type: 'select',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'primary', label: 'Primary' },
      { value: 'success', label: 'Success' },
      { value: 'warning', label: 'Warning' },
      { value: 'danger', label: 'Danger' },
      { value: 'info', label: 'Info' },
    ],
    defaultValue: 'default',
  },
  {
    key: 'size',
    label: 'Size',
    type: 'select',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' },
    ],
    defaultValue: 'md',
  },
];

export function BadgeRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const text = component.title || 'Badge';
  const variant = readProp<string>(component, 'variant', 'default');
  const size = readProp<string>(component, 'size', 'md');

  const variantClasses: Record<string, string> = {
    default: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    info: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  if (editable) {
    return (
      <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
        <EditableTitle
          value={text}
          editable={editable}
          onChange={onTitleChange}
          className="bg-transparent border-none text-inherit"
          placeholder="Badge"
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {text}
    </span>
  );
}

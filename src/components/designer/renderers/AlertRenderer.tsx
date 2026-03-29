import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'variant',
    label: 'Variant',
    type: 'select',
    options: [
      { value: 'info', label: 'Info' },
      { value: 'success', label: 'Success' },
      { value: 'warning', label: 'Warning' },
      { value: 'error', label: 'Error' },
    ],
    defaultValue: 'info',
  },
  {
    key: 'showIcon',
    label: 'Show Icon',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'dismissible',
    label: 'Dismissible',
    type: 'toggle',
    defaultValue: false,
  },
];

export function AlertRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const text = component.title || 'Alert message';
  const variant = readProp<string>(component, 'variant', 'info');
  const showIcon = readProp<boolean>(component, 'showIcon', true);
  const dismissible = readProp<boolean>(component, 'dismissible', false);

  const variantClasses: Record<string, string> = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
  };

  const icons: Record<string, React.ReactNode> = {
    info: <Info size={18} />,
    success: <CheckCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    error: <AlertCircle size={18} />,
  };

  return (
    <div className={`flex items-start gap-3 p-5 rounded-lg border ${variantClasses[variant]}`}>
      {showIcon && <span className="shrink-0 mt-0.5">{icons[variant]}</span>}
      <div className="flex-1">
        {editable ? (
          <EditableTitle
            value={text}
            editable={editable}
            onChange={onTitleChange}
            className="text-sm font-medium bg-transparent border-none text-inherit w-full"
            placeholder="Alert message"
          />
        ) : (
          <p className="text-sm font-medium">{text}</p>
        )}
      </div>
      {dismissible && (
        <button className="shrink-0 p-1 hover:opacity-70 transition-opacity">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

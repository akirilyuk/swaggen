import { ExternalLink } from 'lucide-react';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'url',
    label: 'URL',
    type: 'text',
    placeholder: 'https://example.com',
  },
  {
    key: 'target',
    label: 'Open in',
    type: 'select',
    options: [
      { value: '_self', label: 'Same tab' },
      { value: '_blank', label: 'New tab' },
    ],
    defaultValue: '_blank',
  },
  {
    key: 'variant',
    label: 'Style',
    type: 'select',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'button', label: 'Button' },
      { value: 'subtle', label: 'Subtle' },
    ],
    defaultValue: 'default',
  },
];

export function LinkRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const text = component.title || 'Link text';
  const url = readProp<string>(component, 'url', '#');
  const target = readProp<string>(component, 'target', '_blank');
  const variant = readProp<string>(component, 'variant', 'default');

  const variantClasses: Record<string, string> = {
    default: 'text-blue-600 dark:text-blue-400 hover:underline',
    button:
      'inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700',
    subtle: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
  };

  if (editable) {
    return (
      <div className="flex items-center gap-2">
        <EditableTitle
          value={text}
          editable={editable}
          onChange={onTitleChange}
          className={`${variantClasses[variant]}`}
          placeholder="Link text"
        />
        {target === '_blank' && <ExternalLink size={14} className="text-zinc-400" />}
      </div>
    );
  }

  return (
    <a
      href={url}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={`${variantClasses[variant]} inline-flex items-center gap-1`}
    >
      {text}
      {target === '_blank' && <ExternalLink size={14} />}
    </a>
  );
}

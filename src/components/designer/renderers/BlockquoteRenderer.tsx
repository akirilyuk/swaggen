import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'author',
    label: 'Author',
    type: 'text',
    placeholder: 'Author name',
  },
  {
    key: 'style',
    label: 'Style',
    type: 'select',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'modern', label: 'Modern' },
      { value: 'minimal', label: 'Minimal' },
    ],
    defaultValue: 'default',
  },
];

export function BlockquoteRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const quote = component.title || 'Enter quote text...';
  const author = readProp<string>(component, 'author', '');
  const style = readProp<string>(component, 'style', 'default');

  const styleClasses: Record<string, string> = {
    default: 'border-l-4 border-zinc-300 dark:border-zinc-600 pl-5 py-3 pr-2',
    modern:
      'border-l-4 border-blue-500 pl-5 py-3 pr-3 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg',
    minimal: 'italic text-zinc-500 dark:text-zinc-400',
  };

  return (
    <blockquote className={styleClasses[style]}>
      {editable ? (
        <EditableTitle
          value={quote}
          editable={editable}
          onChange={onTitleChange}
          className="text-lg text-zinc-700 dark:text-zinc-300 w-full"
          placeholder="Enter quote text..."
        />
      ) : (
        <p className="text-lg text-zinc-700 dark:text-zinc-300">{quote}</p>
      )}
      {author && (
        <footer className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          — {author}
        </footer>
      )}
    </blockquote>
  );
}

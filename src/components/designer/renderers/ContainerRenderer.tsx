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
    key: 'background',
    label: 'Background',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'primary', label: 'Primary' },
    ],
    defaultValue: 'none',
  },
  {
    key: 'rounded',
    label: 'Rounded',
    type: 'toggle',
    defaultValue: false,
  },
];

export function ContainerRenderer({ component }: BaseRendererProps) {
  const padding = readProp<string>(component, 'padding', 'md');
  const background = readProp<string>(component, 'background', 'none');
  const rounded = readProp<boolean>(component, 'rounded', false);

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  const bgClasses: Record<string, string> = {
    none: 'bg-transparent',
    light: 'bg-zinc-50 dark:bg-zinc-800/50',
    dark: 'bg-zinc-100 dark:bg-zinc-800',
    primary: 'bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <div
      className={`w-full min-h-[60px] border-2 border-dashed border-zinc-300 dark:border-zinc-600 ${paddingClasses[padding]} ${bgClasses[background]} ${rounded ? 'rounded-lg' : ''} flex items-center justify-center`}
    >
      <span className="text-xs text-zinc-400">Container</span>
    </div>
  );
}

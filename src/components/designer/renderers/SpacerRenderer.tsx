import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'height',
    label: 'Height',
    type: 'select',
    options: [
      { value: 'xs', label: 'Extra Small (8px)' },
      { value: 'sm', label: 'Small (16px)' },
      { value: 'md', label: 'Medium (24px)' },
      { value: 'lg', label: 'Large (32px)' },
      { value: 'xl', label: 'Extra Large (48px)' },
      { value: '2xl', label: '2XL (64px)' },
    ],
    defaultValue: 'md',
  },
];

export function SpacerRenderer({ component }: BaseRendererProps) {
  const height = readProp<string>(component, 'height', 'md');

  const heightClasses: Record<string, string> = {
    xs: 'h-2',
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
    '2xl': 'h-16',
  };

  return (
    <div className={`w-full ${heightClasses[height]} bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700 rounded flex items-center justify-center`}>
      <span className="text-[10px] text-zinc-400">Spacer</span>
    </div>
  );
}

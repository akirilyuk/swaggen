import { Globe } from 'lucide-react';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'src',
    label: 'URL',
    type: 'text',
    placeholder: 'https://example.com',
  },
  {
    key: 'height',
    label: 'Height',
    type: 'select',
    options: [
      { value: 'sm', label: 'Small (200px)' },
      { value: 'md', label: 'Medium (300px)' },
      { value: 'lg', label: 'Large (400px)' },
      { value: 'xl', label: 'Extra Large (500px)' },
      { value: 'video', label: 'Video (16:9)' },
    ],
    defaultValue: 'md',
  },
  {
    key: 'border',
    label: 'Show Border',
    type: 'toggle',
    defaultValue: true,
  },
];

export function IframeRenderer({ component }: BaseRendererProps) {
  const src = readProp<string>(component, 'src', '');
  const height = readProp<string>(component, 'height', 'md');
  const border = readProp<boolean>(component, 'border', true);

  const heightClasses: Record<string, string> = {
    sm: 'h-[200px]',
    md: 'h-[300px]',
    lg: 'h-[400px]',
    xl: 'h-[500px]',
    video: 'aspect-video',
  };

  if (!src) {
    return (
      <div className={`w-full ${heightClasses[height]} bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center ${border ? 'border border-zinc-200 dark:border-zinc-700' : ''}`}>
        <div className="text-center text-zinc-400">
          <Globe size={32} className="mx-auto mb-2" />
          <span className="text-xs">No URL set</span>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      className={`w-full ${heightClasses[height]} rounded-lg ${border ? 'border border-zinc-200 dark:border-zinc-700' : ''}`}
      title={component.title || 'Embedded content'}
      loading="lazy"
    />
  );
}

import { ImageIcon } from 'lucide-react';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'src',
    label: 'Image URL',
    type: 'text',
    placeholder: 'https://example.com/image.jpg',
  },
  {
    key: 'alt',
    label: 'Alt Text',
    type: 'text',
    placeholder: 'Image description',
  },
  {
    key: 'fit',
    label: 'Fit',
    type: 'select',
    options: [
      { value: 'contain', label: 'Contain' },
      { value: 'cover', label: 'Cover' },
      { value: 'fill', label: 'Fill' },
      { value: 'none', label: 'None' },
    ],
    defaultValue: 'cover',
  },
  {
    key: 'rounded',
    label: 'Rounded',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' },
      { value: 'full', label: 'Circle' },
    ],
    defaultValue: 'md',
  },
];

export function ImageRenderer({ component }: BaseRendererProps) {
  const src = readProp<string>(component, 'src', '');
  const alt = readProp<string>(component, 'alt', component.title || 'Image');
  const fit = readProp<string>(component, 'fit', 'cover');
  const rounded = readProp<string>(component, 'rounded', 'md');

  const fitClasses: Record<string, string> = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
  };

  const roundedClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  };

  if (!src) {
    return (
      <div
        className={`flex h-32 w-full items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-800 ${roundedClasses[rounded]}`}
      >
        <div className="text-center text-zinc-400">
          <ImageIcon size={32} className="mx-auto mb-2" />
          <span className="text-xs">No image URL set</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-auto ${fitClasses[fit]} ${roundedClasses[rounded]}`}
    />
  );
}

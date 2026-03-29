import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'style',
    label: 'Style',
    type: 'select',
    options: [
      { value: 'solid', label: 'Solid' },
      { value: 'dashed', label: 'Dashed' },
      { value: 'dotted', label: 'Dotted' },
    ],
    defaultValue: 'solid',
  },
  {
    key: 'thickness',
    label: 'Thickness',
    type: 'select',
    options: [
      { value: 'thin', label: 'Thin' },
      { value: 'normal', label: 'Normal' },
      { value: 'thick', label: 'Thick' },
    ],
    defaultValue: 'normal',
  },
  {
    key: 'color',
    label: 'Color',
    type: 'select',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
    defaultValue: 'default',
  },
];

export function DividerRenderer({ component }: BaseRendererProps) {
  const style = readProp<string>(component, 'style', 'solid');
  const thickness = readProp<string>(component, 'thickness', 'normal');
  const color = readProp<string>(component, 'color', 'default');

  const styleClasses: Record<string, string> = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  };

  const thicknessClasses: Record<string, string> = {
    thin: 'border-t',
    normal: 'border-t-2',
    thick: 'border-t-4',
  };

  const colorClasses: Record<string, string> = {
    default: 'border-zinc-200 dark:border-zinc-700',
    light: 'border-zinc-100 dark:border-zinc-800',
    dark: 'border-zinc-400 dark:border-zinc-500',
  };

  return (
    <hr
      className={`w-full my-3 ${styleClasses[style]} ${thicknessClasses[thickness]} ${colorClasses[color]}`}
    />
  );
}

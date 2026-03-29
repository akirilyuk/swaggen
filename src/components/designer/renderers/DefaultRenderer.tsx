import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';

export const SETTINGS: ComponentSettingDef[] = [];

export function DefaultRenderer({
  component,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const title = component.title || '';

  return (
    <div className="h-full p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-zinc-400 flex items-center justify-center text-sm">
      <EditableTitle
        value={title || 'Custom Component'}
        editable={editable}
        onChange={onTitleChange}
        className="text-zinc-400"
      />
    </div>
  );
}

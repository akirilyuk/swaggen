import React from 'react';

import { resolveFieldForOutput } from '@/lib/entityFieldResolve';

import { usePageRuntime } from '../PageRuntimeContext';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp, fieldBindingHelpers } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'colorTheme',
    label: 'Color Theme',
    type: 'select',
    options: [
      { value: 'blue', label: 'Blue' },
      { value: 'green', label: 'Green' },
      { value: 'red', label: 'Red' },
      { value: 'amber', label: 'Amber' },
      { value: 'purple', label: 'Purple' },
    ],
    defaultValue: 'blue',
  },
  { key: 'statPrefix', label: 'Prefix', type: 'text', placeholder: 'e.g. $' },
  { key: 'statSuffix', label: 'Suffix', type: 'text', placeholder: 'e.g. %' },
];

const STAT_CARD_THEMES: Record<string, string> = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  red: 'bg-red-600',
  amber: 'bg-amber-600',
  purple: 'bg-purple-600',
};

export function StatCardRenderer({
  component,
  editable,
  onTitleChange,
  entities,
}: BaseRendererProps) {
  const { getValue } = usePageRuntime();
  const title = component.title || '';
  const entityId = component.entityId;
  const primaryField = component.visibleFields?.[0];
  const boundFields = component.visibleFields ?? [];
  const hasAnyBoundField = !!entityId && boundFields.length > 0;
  const rawPrimary =
    entityId && primaryField ? getValue(entityId, primaryField) : '';
  const runtimeValue =
    entityId && primaryField
      ? resolveFieldForOutput(entities, entityId, primaryField, rawPrimary)
      : '';
  const { placeholderExample, defaultFallback } = fieldBindingHelpers(boundFields);

  const colorTheme = readProp<string>(component, 'colorTheme', 'blue');
  const bgClass = STAT_CARD_THEMES[colorTheme] ?? STAT_CARD_THEMES.blue;
  const statPrefix = readProp<string>(component, 'statPrefix', '');
  const statSuffix = readProp<string>(component, 'statSuffix', '');

  const interpolate = (text: string) => {
    if (!entityId) return [text];
    const parts: React.ReactNode[] = [];
    const regex = /{(\w+)}/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
      const fieldName = match[1];
      const raw = getValue(entityId, fieldName);
      const val = resolveFieldForOutput(entities, entityId, fieldName, raw);
      parts.push(
        val ? (
          <span key={match.index} className="text-blue-600 dark:text-blue-400">
            {val}
          </span>
        ) : (
          <span
            key={match.index}
            className="text-blue-400/50 italic"
          >{`{${fieldName}}`}</span>
        ),
      );
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx));
    return parts;
  };

  return (
    <div
      className={`h-full p-8 rounded-2xl ${bgClass} text-white shadow-xl flex flex-col justify-center`}
    >
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        inputClassName="text-[10px] font-bold uppercase tracking-widest opacity-80 text-white !border-0 !border-b-0"
        placeholder={hasAnyBoundField ? placeholderExample : 'Stat label...'}
        iconSize={10}
        iconClassName="text-white/60"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block">
          {hasAnyBoundField ? interpolate(title) : title}
        </span>
      </EditableTitle>
      <div className="text-3xl font-black mt-2">
        {hasAnyBoundField ? (
          <>
            {statPrefix && (
              <span className="text-xl font-bold opacity-70">{statPrefix}</span>
            )}
            {runtimeValue || (
              <span className="opacity-30">{editable ? '—' : defaultFallback}</span>
            )}
            {statSuffix && (
              <span className="text-xl font-bold opacity-70">{statSuffix}</span>
            )}
          </>
        ) : (
          '—'
        )}
      </div>
    </div>
  );
}

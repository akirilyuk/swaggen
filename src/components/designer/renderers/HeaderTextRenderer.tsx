import React from 'react';

import { resolveFieldForOutput } from '@/lib/entityFieldResolve';

import { usePageRuntime } from '../PageRuntimeContext';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp, fieldBindingHelpers } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'headingSize',
    label: 'Heading Size',
    type: 'select',
    options: [
      { value: 'h1', label: 'H1 — Extra large' },
      { value: 'h2', label: 'H2 — Large' },
      { value: 'h3', label: 'H3 — Medium' },
      { value: 'h4', label: 'H4 — Small' },
      { value: 'h5', label: 'H5 — Extra small' },
      { value: 'h6', label: 'H6 — Tiny' },
    ],
    defaultValue: 'h2',
  },
  {
    key: 'textAlign',
    label: 'Text Alignment',
    type: 'select',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
    defaultValue: 'left',
  },
  {
    key: 'textColor',
    label: 'Text Color',
    type: 'select',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'zinc', label: 'Gray' },
      { value: 'blue', label: 'Blue' },
      { value: 'green', label: 'Green' },
      { value: 'red', label: 'Red' },
      { value: 'amber', label: 'Amber' },
      { value: 'purple', label: 'Purple' },
    ],
    defaultValue: 'default',
  },
];

const HEADING_SIZE_CLASSES: Record<string, string> = {
  h1: 'text-4xl',
  h2: 'text-xl',
  h3: 'text-lg',
  h4: 'text-base',
  h5: 'text-sm',
  h6: 'text-xs',
};

const TEXT_ALIGN_CLASSES: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const TEXT_COLOR_CLASSES: Record<string, string> = {
  default: 'text-zinc-900 dark:text-white',
  zinc: 'text-zinc-500 dark:text-zinc-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
  amber: 'text-amber-600 dark:text-amber-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

export function HeaderTextRenderer({
  component,
  editable,
  onTitleChange,
  entities,
}: BaseRendererProps) {
  const { getValue } = usePageRuntime();
  const title = component.title || '';
  const entityId = component.entityId;
  const boundFields = component.visibleFields ?? [];
  const hasAnyBoundField = !!entityId && boundFields.length > 0;
  const { placeholderExample } = fieldBindingHelpers(boundFields);

  const sizeClass =
    HEADING_SIZE_CLASSES[readProp(component, 'headingSize', 'h2')] ?? 'text-xl';
  const alignClass =
    TEXT_ALIGN_CLASSES[readProp(component, 'textAlign', 'left')] ?? '';
  const colorClass =
    TEXT_COLOR_CLASSES[readProp(component, 'textColor', 'default')] ??
    TEXT_COLOR_CLASSES.default;

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
    <div className={alignClass}>
      <EditableTitle
        value={title}
        editable={editable}
        onChange={onTitleChange}
        className={alignClass}
        inputClassName={`${sizeClass} font-bold ${colorClass} leading-tight py-2`}
        placeholder={hasAnyBoundField ? placeholderExample : 'Header text...'}
        iconSize={16}
      >
        <span
          role="heading"
          aria-level={parseInt(
            readProp(component, 'headingSize', 'h2').slice(1),
            10,
          )}
          className={`${sizeClass} font-bold ${colorClass} leading-tight block py-2`}
        >
          {hasAnyBoundField ? interpolate(title) : title}
        </span>
      </EditableTitle>
    </div>
  );
}

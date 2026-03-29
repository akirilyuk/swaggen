import { resolveFieldForOutput } from '@/lib/entityFieldResolve';

import { usePageRuntime } from '../PageRuntimeContext';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'striped',
    label: 'Striped Rows',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'compact',
    label: 'Compact Mode',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'pageSize',
    label: 'Page Size',
    type: 'select',
    options: [
      { value: '5', label: '5 rows' },
      { value: '10', label: '10 rows' },
      { value: '25', label: '25 rows' },
      { value: '50', label: '50 rows' },
    ],
    defaultValue: '10',
  },
];

export function ListTableRenderer({
  component,
  editable,
  onTitleChange,
  entities,
}: BaseRendererProps) {
  const { getValue } = usePageRuntime();
  const title = component.title || '';
  const entityId = component.entityId;
  const hasCols = component.visibleFields.length > 0;
  const cols = hasCols ? component.visibleFields : ['ID', 'Name', 'Date'];
  const isStriped = readProp<boolean>(component, 'striped', false);
  const isCompact = readProp<boolean>(component, 'compact', false);
  const pageSize = readProp<string>(component, 'pageSize', '10');
  const cellPadding = isCompact ? 'px-4 py-2' : 'px-5 py-3';

  const getFieldValue = (fieldName: string): string => {
    if (!entityId) return '';
    const raw = getValue(entityId, fieldName);
    return resolveFieldForOutput(entities, entityId, fieldName, raw);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div
        className={`${
          isCompact ? 'px-4 py-2' : 'px-5 py-3'
        } border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between`}
      >
        <EditableTitle
          value={title}
          editable={editable}
          onChange={onTitleChange}
          className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"
        />
        <span className="text-[9px] text-zinc-400">{pageSize} per page</span>
      </div>
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
          <tr>
            {cols.map(f => (
              <th
                key={f}
                className={`${cellPadding} font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]`}
              >
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <tr
            className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors ${
              isStriped ? 'bg-white dark:bg-zinc-900' : ''
            }`}
          >
            {cols.map(f => {
              const val = hasCols && entityId ? getFieldValue(f) : '';
              return (
                <td
                  key={f}
                  className={`${cellPadding} text-zinc-600 dark:text-zinc-400 text-sm`}
                >
                  {val || <span className="opacity-40">{`Sample ${f}`}</span>}
                </td>
              );
            })}
          </tr>
          {[2, 3].map(i => (
            <tr
              key={i}
              className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors ${
                isStriped && i % 2 === 0
                  ? 'bg-zinc-50/50 dark:bg-zinc-800/30'
                  : ''
              }`}
            >
              {cols.map(f => (
                <td
                  key={f}
                  className={`${cellPadding} text-zinc-300 dark:text-zinc-600 text-sm opacity-40`}
                >
                  ...
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

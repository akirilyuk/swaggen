import React from 'react';

import { Card } from '@/components/ui';
import { usePageRuntime } from '../PageRuntimeContext';
import { detectResponseType } from './detectResponseType';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'defaultTitle',
    label: 'Default Title',
    type: 'text',
    placeholder: 'API Response',
    defaultValue: 'API Response',
  },
];

export function ResponseViewRenderer({ component }: BaseRendererProps) {
  const title = component.title || '';
  const defaultTitle = readProp<string>(
    component,
    'defaultTitle',
    'API Response',
  );
  const { getResponse } = usePageRuntime();
  const response = getResponse(component.id);
  const detected = detectResponseType(response?.data);

  let content: React.ReactNode;
  let badgeLabel: string;
  let badgeColor: string;

  if (!response) {
    content = (
      <span className="text-zinc-400 italic">Awaiting response...</span>
    );
    badgeLabel = 'idle';
    badgeColor = 'bg-zinc-200 text-zinc-500';
  } else if (!response.ok) {
    badgeLabel = 'error';
    badgeColor = 'bg-red-100 text-red-600';
    content = (
      <div className="space-y-1">
        <span className="text-xs font-semibold text-red-500">
          {response.status ? `HTTP ${response.status}` : 'Request failed'}
        </span>
        {response.error && (
          <p className="text-xs text-red-400">{response.error}</p>
        )}
        {detected.formatted && (
          <pre className="text-xs text-zinc-500 mt-1 whitespace-pre-wrap">
            {detected.formatted}
          </pre>
        )}
      </div>
    );
  } else {
    badgeLabel = detected.type;
    switch (detected.type) {
      case 'html':
        badgeColor = 'bg-orange-100 text-orange-600';
        content = (
          <iframe
            srcDoc={detected.raw}
            className="w-full min-h-[200px] border-0 bg-white rounded"
            sandbox="allow-scripts allow-same-origin"
            title={title || defaultTitle}
          />
        );
        break;
      case 'xml':
        badgeColor = 'bg-teal-100 text-teal-600';
        content = (
          <pre className="text-xs text-teal-800 dark:text-teal-300 whitespace-pre-wrap">
            {detected.formatted}
          </pre>
        );
        break;
      case 'json':
        badgeColor = 'bg-blue-100 text-blue-600';
        content = (
          <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {detected.formatted}
          </pre>
        );
        break;
      default:
        badgeColor = 'bg-zinc-100 text-zinc-500';
        content = (
          <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {detected.formatted}
          </pre>
        );
        break;
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {title || defaultTitle}
        </h4>
        <span
          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeColor}`}
        >
          {badgeLabel}
        </span>
      </div>
      <div className="max-h-60 overflow-auto">{content}</div>
    </Card>
  );
}

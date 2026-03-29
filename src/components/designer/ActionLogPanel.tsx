'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Trash2, ScrollText } from 'lucide-react';
import { useActionLog, type LogEntry } from './ActionLogContext';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const levelColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  success: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/20',
};

const levelDots: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

function LogEntryRow({ entry }: { entry: LogEntry }) {
  return (
    <div
      className={`flex items-start gap-2 px-3 py-1.5 text-xs border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${levelColors[entry.level]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${levelDots[entry.level]}`} />
      <span className="text-zinc-400 dark:text-zinc-500 flex-shrink-0 font-mono">
        {formatTime(entry.timestamp)}
      </span>
      <span className="font-medium text-zinc-700 dark:text-zinc-300 flex-shrink-0">
        {entry.action}
      </span>
      {entry.details && (
        <span className="text-zinc-500 dark:text-zinc-400 truncate">
          {entry.details}
        </span>
      )}
    </div>
  );
}

export function ActionLogPanel() {
  const { logs, clearLogs } = useActionLog();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  if (typeof document === 'undefined') return null;

  if (isMinimized) {
    return createPortal(
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[99999] flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <ScrollText size={16} className="text-zinc-500" />
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Logs
        </span>
        {logs.length > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
            {logs.length}
          </span>
        )}
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[99999] w-[420px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Action Log
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-full">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 size={12} className="text-zinc-500" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown size={12} className="text-zinc-500" />
            ) : (
              <ChevronUp size={12} className="text-zinc-500" />
            )}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors text-[10px] font-bold text-zinc-500"
            title="Minimize"
          >
            —
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="max-h-[240px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-400">
              No actions logged yet
            </div>
          ) : (
            logs.map(entry => <LogEntryRow key={entry.id} entry={entry} />)
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

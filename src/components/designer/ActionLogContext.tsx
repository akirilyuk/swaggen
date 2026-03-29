'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  action: string;
  details?: string;
}

interface ActionLogContextType {
  logs: LogEntry[];
  log: (level: LogLevel, action: string, details?: string) => void;
  clearLogs: () => void;
}

const ActionLogContext = createContext<ActionLogContextType>({
  logs: [],
  log: () => {},
  clearLogs: () => {},
});

export function useActionLog() {
  return useContext(ActionLogContext);
}

export function ActionLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const log = useCallback((level: LogLevel, action: string, details?: string) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      level,
      action,
      details,
    };
    setLogs(prev => [entry, ...prev].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const value = useMemo(
    () => ({ logs, log, clearLogs }),
    [logs, log, clearLogs],
  );

  return (
    <ActionLogContext.Provider value={value}>
      {children}
    </ActionLogContext.Provider>
  );
}

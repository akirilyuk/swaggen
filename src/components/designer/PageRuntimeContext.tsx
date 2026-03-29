'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { Entity, UIComponent, SubmitAction } from '@/types/project';
import { useActionLog } from './ActionLogContext';
import { useProjectStore } from '@/store/projectStore';
import { toSlug } from '@/lib/projectRegistry';

// ...existing sample data and helpers...

const SAMPLE_NAMES = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
  'Grace',
  'Hank',
];
const SAMPLE_WORDS = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'omega',
  'sigma',
  'nova',
  'apex',
];
const SAMPLE_DESCRIPTIONS = [
  'Quick brown fox jumps over the lazy dog',
  'Lorem ipsum dolor sit amet',
  'The road not taken diverged in a wood',
  'All that glitters is not gold',
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(): string {
  const start = new Date(2024, 0, 1);
  const end = new Date(2026, 11, 31);
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  return d.toISOString().split('T')[0];
}

function generateFieldValue(field: {
  type: string;
  enumValues?: string[];
}): string {
  switch (field.type) {
    case 'string':
      return randomPick(SAMPLE_NAMES);
    case 'number':
      return String(Math.floor(Math.random() * 1000));
    case 'boolean':
      return Math.random() > 0.5 ? 'true' : 'false';
    case 'date':
      return randomDate();
    case 'enum':
      return field.enumValues?.length
        ? randomPick(field.enumValues)
        : 'option_a';
    case 'uuid':
      return (
        crypto.randomUUID?.() ??
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      );
    case 'json':
      return JSON.stringify({
        key: randomPick(SAMPLE_WORDS),
        value: Math.floor(Math.random() * 100),
      });
    default:
      return randomPick(SAMPLE_DESCRIPTIONS);
  }
}

function extractErrorMessage(data: unknown, status: number): string {
  if (typeof data === 'string' && data.trim()) {
    return data.length > 200 ? data.slice(0, 200) + '...' : data;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.errorMessage === 'string') return obj.errorMessage;
    if (obj.errors && Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0];
      if (typeof first === 'string') return first;
      if (
        first &&
        typeof first === 'object' &&
        typeof (first as Record<string, unknown>).message === 'string'
      ) {
        return (first as Record<string, unknown>).message as string;
      }
    }
  }
  return `Request failed with status ${status}`;
}

function matchesApiPathPattern(pattern: string, actualPath: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const actualSegments = actualPath.split('/').filter(Boolean);
  if (patternSegments.length !== actualSegments.length) return false;

  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    const a = actualSegments[i];
    if (p.startsWith('{') && p.endsWith('}')) continue;
    if (p !== a) return false;
  }
  return true;
}

function stripProjectApiPrefix(path: string, projectSlug: string): string {
  const withoutQuery = path.split('?')[0].split('#')[0];
  const prefixed = `/api/${projectSlug}`;
  if (withoutQuery === prefixed) return '/';
  if (withoutQuery.startsWith(`${prefixed}/`))
    return withoutQuery.slice(prefixed.length);
  if (withoutQuery === '/api') return '/';
  if (withoutQuery.startsWith('/api/')) return withoutQuery.slice('/api'.length);
  return withoutQuery;
}

export interface SubmitResult {
  ok: boolean;
  status: number;
  data: unknown;
  error?: string;
}

interface PageRuntimeContextType {
  getValue: (entityId: string, fieldName: string) => string;
  setValue: (entityId: string, fieldName: string, value: string) => void;
  /** Snapshot of all entity field values (entity id → field name → value) */
  getEntityValuesSnapshot: () => Record<string, Record<string, string>>;
  generateTestData: (entities: Entity[]) => void;
  clearAll: () => void;
  hasData: boolean;
  /** The result of the last `executeSubmit` call */
  lastResponse: SubmitResult | null;
  /**
   * Collect values from the given input components and fire the HTTP action.
   * Each component's bound field(s) are used as the payload key(s).
   * Falls back to the component title as key when no field is bound.
   */
  executeSubmit: (
    linkedComponents: UIComponent[],
    action: SubmitAction,
    submitButtonId: string,
  ) => Promise<SubmitResult>;
  getResponse: (responseViewId?: string) => SubmitResult | null;
  /** Push data into a response-view (for Run Code buttons) */
  setResponseViewData: (responseViewId: string, data: unknown) => void;
}

const PageRuntimeContext = createContext<PageRuntimeContextType>({
  getValue: () => '',
  setValue: () => {},
  getEntityValuesSnapshot: () => ({}),
  generateTestData: () => {},
  clearAll: () => {},
  hasData: false,
  lastResponse: null,
  executeSubmit: async () => ({
    ok: false,
    status: 0,
    data: null,
    error: 'No runtime',
  }),
  getResponse: () => null,
  setResponseViewData: () => {},
});

export function usePageRuntime() {
  return useContext(PageRuntimeContext);
}

/** Serializable entity field values for hydration / save */
export type EntityValuesSnapshot = Record<string, Record<string, string>>;

export function PageRuntimeProvider({
  children,
  initialEntityValues,
  snapshotRef,
}: {
  children: ReactNode;
  /** Hydrate runtime (e.g. from `UIPage.previewEntityValues`) */
  initialEntityValues?: EntityValuesSnapshot;
  /** Parent sets this to read `getEntityValuesSnapshot` on save */
  snapshotRef?: MutableRefObject<(() => EntityValuesSnapshot) | null>;
}) {
  const { log } = useActionLog();
  const project = useProjectStore(s => s.activeProject());
  const initialKey = useMemo(
    () => JSON.stringify(initialEntityValues ?? {}),
    [initialEntityValues],
  );
  const [values, setValues] = useState<EntityValuesSnapshot>(() =>
    initialEntityValues && Object.keys(initialEntityValues).length
      ? JSON.parse(JSON.stringify(initialEntityValues))
      : {},
  );

  useEffect(() => {
    try {
      const parsed = JSON.parse(initialKey) as EntityValuesSnapshot;
      setValues(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setValues({});
    }
  }, [initialKey]);
  const [testDataKeys, setTestDataKeys] = useState<Set<string>>(new Set());
  const [lastResponse, setLastResponse] = useState<SubmitResult | null>(null);
  const [responses, setResponses] = useState<Record<string, SubmitResult>>({});

  const hasData = Object.keys(values).some(
    k => Object.keys(values[k]).length > 0,
  );

  const getValue = useCallback(
    (entityId: string, fieldName: string): string => {
      return values[entityId]?.[fieldName] ?? '';
    },
    [values],
  );

  const getEntityValuesSnapshot = useCallback((): EntityValuesSnapshot => {
    return JSON.parse(JSON.stringify(values)) as EntityValuesSnapshot;
  }, [values]);

  useEffect(() => {
    if (!snapshotRef) return;
    snapshotRef.current = getEntityValuesSnapshot;
    return () => {
      snapshotRef.current = null;
    };
  }, [snapshotRef, getEntityValuesSnapshot]);

  const setResponseViewData = useCallback(
    (responseViewId: string, data: unknown) => {
      const result: SubmitResult = {
        ok: true,
        status: 200,
        data,
      };
      setResponses(prev => ({ ...prev, [responseViewId]: result }));
      setLastResponse(result);
    },
    [],
  );

  const setValue = useCallback(
    (entityId: string, fieldName: string, value: string) => {
      const key = `${entityId}:${fieldName}`;
      setTestDataKeys(prev => {
        if (prev.has(key)) {
          const next = new Set(prev);
          next.delete(key);
          return next;
        }
        return prev;
      });
      setValues(prev => ({
        ...prev,
        [entityId]: {
          ...prev[entityId],
          [fieldName]: value,
        },
      }));
    },
    [],
  );

  const generateTestData = useCallback(
    (entities: Entity[]) => {
      const generated: Record<string, Record<string, string>> = {};
      const generatedKeys = new Set<string>();

      for (const entity of entities) {
        generated[entity.id] = {};
        for (const field of entity.fields) {
          const key = `${entity.id}:${field.name}`;
          generated[entity.id][field.name] = generateFieldValue(field);
          generatedKeys.add(key);
        }
      }

      setValues(prev => {
        const merged: Record<string, Record<string, string>> = { ...generated };
        for (const entityId of Object.keys(prev)) {
          for (const fieldName of Object.keys(prev[entityId])) {
            const key = `${entityId}:${fieldName}`;
            if (!generatedKeys.has(key)) {
              if (!merged[entityId]) merged[entityId] = {};
              merged[entityId][fieldName] = prev[entityId][fieldName];
            }
          }
        }
        return merged;
      });
      setTestDataKeys(generatedKeys);
      log(
        'success',
        'Test data generated',
        `${entities.length} entities, ${generatedKeys.size} fields`,
      );
    },
    [log],
  );

  const clearAll = useCallback(() => {
    const clearedCount = testDataKeys.size;
    setValues(prev => {
      const filtered: Record<string, Record<string, string>> = {};
      for (const entityId of Object.keys(prev)) {
        for (const fieldName of Object.keys(prev[entityId])) {
          const key = `${entityId}:${fieldName}`;
          if (!testDataKeys.has(key)) {
            if (!filtered[entityId]) filtered[entityId] = {};
            filtered[entityId][fieldName] = prev[entityId][fieldName];
          }
        }
      }
      return filtered;
    });
    setTestDataKeys(new Set());
    log('info', 'Test data cleared', `${clearedCount} fields removed`);
  }, [testDataKeys, log]);

  const executeSubmit = useCallback(
    async (
      linkedComponents: UIComponent[],
      action: SubmitAction,
      submitButtonId: string,
    ): Promise<SubmitResult> => {
      const payloadMode = action.payloadMode ?? 'linked';

      // 1. Collect linked input values
      const linkedPayload: Record<string, unknown> = {};
      if (payloadMode === 'linked' || payloadMode === 'merged') {
        for (const comp of linkedComponents) {
          if (comp.entityId && comp.visibleFields.length > 0) {
            for (const field of comp.visibleFields) {
              linkedPayload[field] = values[comp.entityId]?.[field] ?? '';
            }
          } else {
            const key = comp.title || comp.id;
            linkedPayload[key] = '';
          }
        }
      }

      // 2. Collect entity data
      const entityPayload: Record<string, unknown> = {};
      if (payloadMode === 'entities' || payloadMode === 'merged') {
        const entityIds =
          'payloadEntityIds' in action ? action.payloadEntityIds : undefined;
        if (entityIds?.length) {
          for (const entityId of entityIds) {
            const entityValues = values[entityId];
            if (entityValues) {
              Object.assign(entityPayload, entityValues);
            }
          }
        }
      }

      // 3. Parse custom JSON payload
      let customPayload: Record<string, unknown> = {};
      if (payloadMode === 'custom' || payloadMode === 'merged') {
        const raw =
          'customPayload' in action ? action.customPayload : undefined;
        if (raw) {
          try {
            customPayload = JSON.parse(raw);
          } catch {
            console.warn(
              '[PageRuntime] Invalid custom JSON payload — ignoring',
            );
          }
        }
      }

      // 4. Merge payloads based on mode
      let payload: Record<string, unknown>;
      switch (payloadMode) {
        case 'entities':
          payload = entityPayload;
          break;
        case 'custom':
          payload = customPayload;
          break;
        case 'merged':
          payload = { ...linkedPayload, ...entityPayload, ...customPayload };
          break;
        default:
          payload = linkedPayload;
      }

      let result: SubmitResult;
      try {
        // ... (fetch logic is unchanged)
        let url = action.url.trim();
        const isAbsoluteHttp = /^https?:\/\//i.test(url);
        const slug = project ? toSlug(project.name) : '';
        const isInternalApi = url.startsWith('/api/');

        // Resolve project API paths to dynamic endpoint: /api/{projectSlug}/{...path}
        if (!isAbsoluteHttp && url.startsWith('/') && project) {
          const [pathOnly, query = ''] = url.split('?');
          const candidatePath = isInternalApi
            ? stripProjectApiPrefix(pathOnly, slug)
            : pathOnly;
          const matchesConfiguredPath = (project.apiPaths ?? []).some(ap =>
            matchesApiPathPattern(ap.path, candidatePath),
          );
          if (matchesConfiguredPath) {
            url = `/api/${slug}${candidatePath}${query ? `?${query}` : ''}`;
          }
        }

        if (!url.startsWith('http') && !url.startsWith('/')) {
          url = `https://${url}`;
        }
        // ... (rest of fetch logic)
        let body: BodyInit | undefined;
        const headers: Record<string, string> = {};

        if (action.payloadFormat === 'form-data') {
          const fd = new FormData();
          for (const [k, v] of Object.entries(payload)) {
            fd.append(k, String(v));
          }
          body = fd;
        } else {
          body = JSON.stringify(payload);
          headers['Content-Type'] = 'application/json';
        }

        const isExternal = url.startsWith('http');
        const hasBody = !['GET', 'DELETE'].includes(action.method);

        if (isExternal) {
          const proxyRes = await fetch('/api/cors-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              method: action.method,
              headers,
              body: hasBody ? payload : undefined,
            }),
          });

          const contentType = proxyRes.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            const html = await proxyRes.text();
            result = { ok: proxyRes.ok, status: proxyRes.status, data: html };
          } else if (proxyRes.ok) {
            const { ok, status, data, error } = await proxyRes.json();
            result = { ok, status, data, error };
          } else {
            const { error } = await proxyRes.json();
            result = { ok: false, status: proxyRes.status, data: null, error };
          }
        } else {
          const res = await fetch(url, {
            method: action.method,
            headers,
            ...(hasBody ? { body } : {}),
          });
          let data: unknown;
          const contentType = res.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            data = await res.json();
          } else {
            data = await res.text();
          }
          if (res.ok) {
            result = { ok: true, status: res.status, data };
          } else {
            const errorMsg = extractErrorMessage(data, res.status);
            result = { ok: false, status: res.status, data, error: errorMsg };
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        if (error.includes('Failed to fetch')) {
          result = {
            ok: false,
            status: 0,
            data: null,
            error: 'CORS Error: The request was blocked by the browser.',
          };
        } else {
          result = { ok: false, status: 0, data: null, error };
        }
      }

      if (action.responseViewId) {
        setResponses(prev => ({ ...prev, [action.responseViewId!]: result }));
      } else {
        // Find any response views linked to this button
        const linkedViews =
          document.querySelectorAll(
            `[data-linked-submit-button-id="${submitButtonId}"]`,
          ) ?? [];
        if (linkedViews.length > 0) {
          const updates: Record<string, SubmitResult> = {};
          linkedViews.forEach(el => {
            const viewId = el.getAttribute('data-component-id');
            if (viewId) updates[viewId] = result;
          });
          setResponses(prev => ({ ...prev, ...updates }));
        } else {
          setLastResponse(result);
        }
      }

      if (result.ok) {
        log(
          'success',
          'API request succeeded',
          `${action.method} ${action.url} → ${result.status}`,
        );
      } else {
        log(
          'error',
          'API request failed',
          `${action.method} ${action.url} → ${result.status}: ${
            result.error || 'Unknown error'
          }`,
        );
      }

      return result;
    },
    [values, log],
  );

  const getResponse = (responseViewId?: string) => {
    return responseViewId ? responses[responseViewId] : lastResponse;
  };

  return (
    <PageRuntimeContext.Provider
      value={{
        getValue,
        setValue,
        getEntityValuesSnapshot,
        generateTestData,
        clearAll,
        hasData,
        lastResponse,
        executeSubmit,
        getResponse,
        setResponseViewData,
      }}
    >
      {children}
    </PageRuntimeContext.Provider>
  );
}

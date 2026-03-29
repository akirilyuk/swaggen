'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { usePageRuntime } from '../PageRuntimeContext';
import type { UIComponent } from '@/types/project';
import { EditableTitle } from './EditableTitle';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

/* ---- Settings ---- */

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'variant',
    label: 'Variant',
    type: 'select',
    options: [
      { value: 'primary', label: 'Primary' },
      { value: 'secondary', label: 'Secondary' },
      { value: 'outline', label: 'Outline' },
      { value: 'ghost', label: 'Ghost' },
      { value: 'danger', label: 'Danger' },
    ],
    defaultValue: 'primary',
  },
  {
    key: 'size',
    label: 'Size',
    type: 'select',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' },
    ],
    defaultValue: 'md',
  },
  {
    key: 'fullWidth',
    label: 'Full Width',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'actionType',
    label: 'Action Type',
    type: 'select',
    options: [
      { value: 'none', label: 'None (plain button)' },
      { value: 'http', label: 'HTTP Request' },
      { value: 'code', label: 'Run Code' },
    ],
    defaultValue: 'none',
  },
  {
    key: 'confirmationText',
    label: 'Confirm before action',
    type: 'text',
    placeholder:
      'Optional — browser confirm dialog (e.g. delete warnings)',
  },
  {
    key: 'onSuccess',
    label: 'On Success',
    type: 'select',
    options: [
      { value: 'icon', label: 'Show check icon' },
      { value: 'message', label: 'Show success message' },
      { value: 'alert', label: 'Show success alert' },
      { value: 'none', label: 'Do nothing' },
    ],
    defaultValue: 'icon',
  },
  {
    key: 'onError',
    label: 'On Error',
    type: 'select',
    options: [
      { value: 'message', label: 'Show error message' },
      { value: 'alert', label: 'Show error alert' },
      { value: 'icon', label: 'Show error icon' },
      { value: 'none', label: 'Do nothing' },
    ],
    defaultValue: 'message',
  },
  {
    key: 'codeAction',
    label: 'Code to execute',
    type: 'textarea',
    placeholder: `// On click you receive:
// - linkedValues: { [label]: value } from linked inputs
// - entityValues: { [entityId]: { [fieldName]: value } } for all bound data
// - setResponse(data): optional — show JSON in the Response View chosen below
//
setResponse({ hello: linkedValues, snapshot: entityValues });`,
    defaultValue: '',
  },
  {
    key: 'codeResponseViewId',
    label: 'Show code output in response view',
    type: 'select',
    options: [{ value: '', label: '— None —' }],
    defaultValue: '',
  },
];

/* ---- Style maps ---- */

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary:
    'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600',
  outline:
    'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  ghost:
    'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

/* ---- Error content helpers ---- */

type ErrorContent =
  | { type: 'text'; content: string }
  | { type: 'json'; content: string }
  | { type: 'html'; content: string };

function isHtmlContent(str: string): boolean {
  const t = str.trim();
  return (
    t.startsWith('<!DOCTYPE') ||
    t.startsWith('<html') ||
    t.startsWith('<HTML') ||
    (t.startsWith('<') && t.includes('</'))
  );
}

function parseErrorContent(data: unknown): ErrorContent | null {
  if (!data) return null;

  if (typeof data === 'string') {
    return isHtmlContent(data)
      ? { type: 'html', content: data }
      : { type: 'text', content: data };
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['error', 'message', 'detail', 'errorMessage']) {
      if (typeof obj[key] === 'string') {
        const s = obj[key] as string;
        return isHtmlContent(s)
          ? { type: 'html', content: s }
          : { type: 'text', content: s };
      }
    }
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0];
      if (typeof first === 'string') {
        return isHtmlContent(first)
          ? { type: 'html', content: first }
          : { type: 'text', content: first };
      }
      if (
        first &&
        typeof first === 'object' &&
        typeof (first as Record<string, unknown>).message === 'string'
      ) {
        const msg = (first as Record<string, unknown>).message as string;
        return isHtmlContent(msg)
          ? { type: 'html', content: msg }
          : { type: 'text', content: msg };
      }
    }
    return { type: 'json', content: JSON.stringify(data, null, 2) };
  }

  return null;
}

/* ---- Renderer ---- */

function resolveButtonVariant(component: UIComponent) {
  const p = component.props ?? {};
  const v = p.variant as string | undefined;
  const b = p.buttonVariant as string | undefined;
  return (
    (v !== undefined && v !== '' ? v : undefined) ??
    (b !== undefined && b !== '' ? b : undefined) ??
    'primary'
  );
}

export function ButtonRenderer({
  component,
  siblingComponents,
  editable,
  onTitleChange,
}: BaseRendererProps) {
  const {
    executeSubmit,
    getValue,
    getEntityValuesSnapshot,
    setResponseViewData,
  } = usePageRuntime();
  const title = component.title || 'Button';

  const variant = resolveButtonVariant(component);
  const size = readProp<string>(component, 'size', 'md');
  const fullWidth = readProp<boolean>(component, 'fullWidth', false);
  const actionType = readProp<string>(component, 'actionType', 'none');
  const confirmationText = readProp<string>(component, 'confirmationText', '');
  const onSuccess = readProp<string>(component, 'onSuccess', 'icon');
  const onError = readProp<string>(component, 'onError', 'message');
  const codeAction = readProp<string>(component, 'codeAction', '');
  const codeResponseViewId = readProp<string>(component, 'codeResponseViewId', '');

  const action = component.submitAction;
  const linkedIds = component.linkedComponentIds ?? [];
  const linkedComps = siblingComponents.filter(c => linkedIds.includes(c.id));

  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    'idle',
  );
  const [errorContent, setErrorContent] = useState<ErrorContent | null>(null);

  /** Collect linked input values as a key-value map. */
  const collectLinkedValues = (): Record<string, string> => {
    const values: Record<string, string> = {};
    for (const comp of linkedComps) {
      const fieldName = comp.visibleFields?.[0] ?? comp.title ?? comp.template;
      const entityId = comp.entityId;
      if (entityId && comp.visibleFields?.[0]) {
        values[fieldName] = getValue(entityId, comp.visibleFields[0]);
      }
    }
    return values;
  };

  const handleClick = async () => {
    const confirmMsg = confirmationText.trim();
    if (confirmMsg && typeof window !== 'undefined') {
      const ok = window.confirm(confirmMsg);
      if (!ok) return;
    }

    // In editable mode, log the action for debugging but still execute
    if (editable) {
      console.log('[ButtonRenderer] Button clicked in design mode:', {
        actionType,
        action,
        linkedIds,
      });
    }

    if (actionType === 'http') {
      if (!action?.url) return;
      setStatus('loading');
      setErrorContent(null);
      const result = await executeSubmit(linkedComps, action, component.id);
      if (result.ok) {
        setStatus('ok');
        if (onSuccess === 'alert') alert('Success!');
      } else {
        setStatus('error');
        const errContent =
          result.error && !isHtmlContent(result.error)
            ? ({ type: 'text', content: result.error } as ErrorContent)
            : result.error
            ? ({ type: 'html', content: result.error } as ErrorContent)
            : parseErrorContent(result.data) ?? {
                type: 'text' as const,
                content: 'An error occurred',
              };
        setErrorContent(errContent);
        if (onError === 'alert') {
          alert(
            `Error: ${
              errContent.type === 'html'
                ? 'See details below'
                : errContent.content
            }`,
          );
        }
      }
      setTimeout(() => {
        setStatus('idle');
        setErrorContent(null);
      }, 5000);
    }

    if (actionType === 'code' && codeAction) {
      setStatus('loading');
      setErrorContent(null);
      try {
        const linkedValues = collectLinkedValues();
        const entityValues = getEntityValuesSnapshot();

        const setResponse = (data: unknown) => {
          const targetId =
            codeResponseViewId ||
            component.submitAction?.responseViewId ||
            '';
          if (targetId) {
            setResponseViewData(targetId, data);
          }
        };

        const fn = new Function(
          'linkedValues',
          'entityValues',
          'setResponse',
          'console',
          `"use strict";\n${codeAction}`,
        );
        fn(linkedValues, entityValues, setResponse, console);
        setStatus('ok');
        if (onSuccess === 'alert') alert('Code executed successfully!');
      } catch (err) {
        setStatus('error');
        const msg = err instanceof Error ? err.message : String(err);
        setErrorContent({ type: 'text', content: msg });
        if (onError === 'alert') alert(`Error: ${msg}`);
      }
      setTimeout(() => {
        setStatus('idle');
        setErrorContent(null);
      }, 5000);
    }
  };

  const effectiveVariant = status === 'error' ? 'danger' : variant;
  const btnClasses = `inline-flex items-center justify-center rounded-lg font-medium transition-colors ${
    VARIANT_CLASSES[effectiveVariant] ?? VARIANT_CLASSES.primary
  } ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${fullWidth ? 'w-full' : ''}`;

  return (
    <div className="relative">
      <button
        type="button"
        className={btnClasses}
        onClick={handleClick}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            {actionType === 'code' ? 'Running…' : 'Sending…'}
          </span>
        ) : status === 'ok' && onSuccess === 'icon' ? (
          <Check size={18} />
        ) : status === 'error' && onError === 'icon' ? (
          <X size={18} />
        ) : (
          <EditableTitle
            value={title}
            editable={editable}
            onChange={onTitleChange}
            className="bg-transparent border-none text-inherit"
            placeholder="Button text"
          />
        )}
      </button>

      {status === 'ok' && onSuccess === 'message' && (
        <span className="block text-[10px] mt-1 text-center font-medium text-green-600">
          Success!
        </span>
      )}

      {status === 'error' && errorContent && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-50">
          {errorContent.type === 'html' ? (
            <div className="relative bg-white border border-red-300 rounded-md shadow-lg overflow-hidden">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-red-300 rotate-45" />
              <div className="bg-red-600 text-white text-xs px-3 py-1 font-medium">
                Error Response
              </div>
              <iframe
                srcDoc={errorContent.content}
                className="w-[400px] h-[300px] border-0"
                sandbox="allow-same-origin"
                title="Error response"
              />
            </div>
          ) : errorContent.type === 'json' ? (
            <div className="relative bg-zinc-900 text-green-400 text-xs rounded-md shadow-lg overflow-hidden max-w-md">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 rotate-45" />
              <div className="bg-red-600 text-white text-xs px-3 py-1 font-medium">
                Error Response (JSON)
              </div>
              <pre className="p-4 overflow-auto max-h-[200px] text-[11px]">
                {errorContent.content}
              </pre>
            </div>
          ) : (
            <div className="relative bg-red-600 text-white text-xs px-3 py-2 rounded-md shadow-lg max-w-xs">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-600 rotate-45" />
              <span className="relative">{errorContent.content}</span>
            </div>
          )}
        </div>
      )}

      {editable && actionType === 'http' && action?.url && (
        <span className="block text-[9px] text-zinc-400 mt-1 text-center italic">
          {action.method} {action.url}
          {linkedIds.length > 0 &&
            ` · ${linkedIds.length} input${linkedIds.length !== 1 ? 's' : ''}`}
        </span>
      )}

      {editable && actionType === 'code' && codeAction && (
        <span className="block text-[9px] text-zinc-400 mt-1 text-center italic">
          ƒ custom code
          {linkedIds.length > 0 &&
            ` · ${linkedIds.length} input${linkedIds.length !== 1 ? 's' : ''}`}
        </span>
      )}

      {editable && confirmationText.trim() && (
        <span className="block text-[9px] text-zinc-400 mt-1 text-center italic">
          Confirms: &ldquo;{confirmationText.trim()}&rdquo;
        </span>
      )}
    </div>
  );
}

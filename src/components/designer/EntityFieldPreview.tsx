'use client';

import { useEffect, useMemo, useRef } from 'react';

import { usePageRuntime } from '@/components/designer/PageRuntimeContext';
import { previewValueForField } from '@/lib/entityFieldPreview';
import type { Entity, EntityField } from '@/types/project';

interface EntityFieldPreviewProps {
  entity: Entity;
  /** If set, only these fields; otherwise all entity fields */
  visibleFieldNames?: string[];
  className?: string;
  /**
   * When true (designer edit mode with PageRuntimeProvider), bind values to
   * page runtime so the canvas and previews stay in sync; touch-friendly inputs.
   */
  interactive?: boolean;
  /**
   * Click the field name to insert `{fieldName}` into the selected layer
   * (same as the left palette field buttons).
   */
  onFieldNameClick?: (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => void;
}

/**
 * Sample values for bound entity fields (design-time). Static when
 * `interactive` is false; otherwise editable via page runtime.
 */
function FieldNameLabel({
  entityId,
  field,
  onFieldNameClick,
}: {
  entityId: string;
  field: EntityField;
  onFieldNameClick?: (entityId: string, fieldName: string, fieldType: string) => void;
}) {
  const cls =
    'shrink-0 font-mono text-[10px] text-amber-700/90 dark:text-amber-400/90';
  if (onFieldNameClick) {
    return (
      <button
        type="button"
        className={`${cls} cursor-pointer rounded px-0.5 text-left hover:underline hover:text-amber-600 dark:hover:text-amber-300 touch-manipulation`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onFieldNameClick(entityId, field.name, field.type);
        }}
        title={`Add {${field.name}} to the selected layer content`}
      >
        {field.name}
      </button>
    );
  }
  return <span className={cls}>{field.name}</span>;
}

export function EntityFieldPreview({
  entity,
  visibleFieldNames,
  className = '',
  interactive = false,
  onFieldNameClick,
}: EntityFieldPreviewProps) {
  const { getValue, setValue } = usePageRuntime();

  const fields = useMemo(() => {
    if (visibleFieldNames?.length) {
      return visibleFieldNames
        .map(name => entity.fields.find(f => f.name === name))
        .filter((f): f is EntityField => Boolean(f));
    }
    return entity.fields;
  }, [entity, visibleFieldNames]);

  const fieldsKey = useMemo(() => fields.map(f => f.name).join('\0'), [fields]);
  const entityId = entity.id;
  const seededRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    seededRef.current.clear();
  }, [entityId]);

  useEffect(() => {
    if (!interactive || !entityId || fields.length === 0) return;
    for (const f of fields) {
      const key = `${entityId}:${f.name}`;
      if (seededRef.current.has(key)) continue;
      seededRef.current.add(key);
      if (!getValue(entityId, f.name)) {
        setValue(entityId, f.name, previewValueForField(f));
      }
    }
  }, [interactive, entityId, fieldsKey, fields, getValue, setValue]);

  if (fields.length === 0) return null;

  if (interactive) {
    return (
      <div
        className={`rounded-lg border border-zinc-200 bg-zinc-50/90 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/60 ${className}`}
      >
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Preview values (editable)
        </p>
        <ul className="max-h-40 space-y-2 overflow-y-auto pr-0.5">
          {fields.map(f => (
            <li
              key={f.name}
              className="flex flex-col gap-1 border-b border-zinc-100/80 pb-2 last:border-0 last:pb-0 dark:border-zinc-800/80 sm:flex-row sm:items-center sm:gap-2"
            >
              <FieldNameLabel
                entityId={entityId}
                field={f}
                onFieldNameClick={onFieldNameClick}
              />
              <input
                type="text"
                inputMode={f.type === 'number' ? 'decimal' : 'text'}
                className="min-h-10 min-w-0 flex-1 touch-manipulation rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[10px] leading-snug text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                value={getValue(entityId, f.name)}
                placeholder={previewValueForField(f)}
                onChange={e => setValue(entityId, f.name, e.target.value)}
                onPointerDown={e => e.stopPropagation()}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-zinc-50/90 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/60 ${className}`}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Preview values
      </p>
      <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-0.5">
        {fields.map(f => {
          const sample = previewValueForField(f);
          return (
            <li
              key={f.name}
              className="flex items-start justify-between gap-2 border-b border-zinc-100/80 pb-1.5 last:border-0 last:pb-0 dark:border-zinc-800/80"
            >
              <FieldNameLabel
                entityId={entityId}
                field={f}
                onFieldNameClick={onFieldNameClick}
              />
              <span
                className="min-w-0 max-w-[58%] break-all text-right text-[10px] leading-snug text-zinc-700 dark:text-zinc-200"
                title={sample}
              >
                {sample}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

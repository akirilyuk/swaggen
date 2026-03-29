'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Trash2,
  GripVertical,
  Database,
  Settings2,
  Wrench,
  Link2,
  Zap,
  Save,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { Button, Select, Textarea } from '@/components/ui';
import { Input } from '@/components/ui';
import { ComponentRenderer } from './ComponentRenderer';
import { ComponentSettingsFields } from './ComponentSettingsFields';
import { useActionLog } from './ActionLogContext';
import type {
  ApiPath,
  UIComponent,
  Entity,
  SubmitAction,
} from '@/types/project';
import type { ComponentSettingDef } from './renderers/types';
import { COMPONENT_SETTINGS } from './componentSettingsConfig';

function filterButtonSettings(
  defs: ComponentSettingDef[],
  props: Record<string, unknown>,
): ComponentSettingDef[] {
  const actionType = (props.actionType as string) ?? 'none';
  return defs.filter(def => {
    if (def.key === 'codeAction' || def.key === 'codeResponseViewId') {
      return actionType === 'code';
    }
    if (def.key === 'onSuccess' || def.key === 'onError') {
      return actionType === 'http' || actionType === 'code';
    }
    return true;
  });
}

interface FreeFormDesignerItemProps {
  id: string;
  component: UIComponent;
  entities: Entity[];
  /** All other components on the page — used by button to pick inputs to link */
  siblingComponents?: UIComponent[];
  /** Project API paths — used by button to pick a target endpoint */
  apiPaths?: ApiPath[];
  /** URL-safe project slug — used to build live API URLs */
  projectSlug?: string;
  onUpdate: (patch: Partial<UIComponent>) => void;
  onRemove: () => void;
  isLinkHovered?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
}

export function FreeFormDesignerItem({
  id,
  component,
  entities,
  siblingComponents = [],
  apiPaths = [],
  projectSlug = '',
  onUpdate,
  onRemove,
  isLinkHovered = false,
  isFocused = false,
  onFocus,
}: FreeFormDesignerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: {
      type: 'canvas-item',
      componentId: id,
    },
  });

  const { setNodeRef: setDroppableRef, isOver: isDropOver } = useDroppable({
    id: `drop-zone-${id}`,
    data: {
      type: 'component-drop-zone',
      componentId: id,
    },
  });

  const { log } = useActionLog();
  const [showSettings, setShowSettings] = useState(false);
  const [showDataBinding, setShowDataBinding] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local draft state for settings that require explicit save
  const [draftTitle, setDraftTitle] = useState<string>(component.title);
  const [draftProps, setDraftProps] = useState<Record<string, unknown>>(
    component.props,
  );
  const [draftAction, setDraftAction] = useState<SubmitAction>(
    component.submitAction ?? {
      method: 'POST',
      url: '',
      payloadFormat: 'json',
    },
  );
  const [draftLinkedIds, setDraftLinkedIds] = useState<string[]>(
    component.linkedComponentIds ?? [],
  );
  const [draftEntityId, setDraftEntityId] = useState<string | null>(
    component.entityId,
  );
  const [draftVisibleFields, setDraftVisibleFields] = useState<string[]>(
    component.visibleFields,
  );
  const [draftLinkedSubmitButtonId, setDraftLinkedSubmitButtonId] = useState<
    string | undefined
  >(component.linkedSubmitButtonId);

  // Track if there are unsaved changes
  const hasUnsavedChanges =
    draftTitle !== component.title ||
    JSON.stringify(draftProps) !== JSON.stringify(component.props) ||
    JSON.stringify(draftAction) !==
      JSON.stringify(
        component.submitAction ?? {
          method: 'POST',
          url: '',
          payloadFormat: 'json',
        },
      ) ||
    JSON.stringify(draftLinkedIds) !==
      JSON.stringify(component.linkedComponentIds ?? []) ||
    draftEntityId !== component.entityId ||
    JSON.stringify(draftVisibleFields) !==
      JSON.stringify(component.visibleFields) ||
    draftLinkedSubmitButtonId !== component.linkedSubmitButtonId;

  // Reset draft state when component changes externally (use stable serialized key)
  const componentKey = JSON.stringify({
    id: component.id,
    title: component.title,
    props: component.props,
    submitAction: component.submitAction,
    linkedComponentIds: component.linkedComponentIds,
    entityId: component.entityId,
    visibleFields: component.visibleFields,
    linkedSubmitButtonId: component.linkedSubmitButtonId,
  });
  useEffect(() => {
    setDraftTitle(component.title);
    setDraftProps(component.props);
    setDraftAction(
      component.submitAction ?? {
        method: 'POST',
        url: '',
        payloadFormat: 'json',
      },
    );
    setDraftLinkedIds(component.linkedComponentIds ?? []);
    setDraftEntityId(component.entityId);
    setDraftVisibleFields(component.visibleFields);
    setDraftLinkedSubmitButtonId(component.linkedSubmitButtonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentKey]);

  const saveChanges = () => {
    if (!hasUnsavedChanges) return;

    const changes: string[] = [];
    const compName = draftTitle || component.template;

    if (draftTitle !== component.title) {
      changes.push(`title: "${draftTitle}"`);
    }
    if (JSON.stringify(draftProps) !== JSON.stringify(component.props)) {
      const valueChanged = draftProps.value !== component.props?.value;
      if (valueChanged && draftProps.value) {
        const valueStr = String(draftProps.value);
        changes.push(
          `value: "${
            valueStr.length > 20 ? valueStr.slice(0, 20) + '...' : valueStr
          }"`,
        );
      }
      const otherPropsChanged =
        JSON.stringify({ ...draftProps, value: undefined }) !==
        JSON.stringify({ ...component.props, value: undefined });
      if (otherPropsChanged) {
        changes.push('properties');
      }
    }
    if (
      JSON.stringify(draftAction) !==
      JSON.stringify(
        component.submitAction ?? {
          method: 'POST',
          url: '',
          payloadFormat: 'json',
        },
      )
    ) {
      if (draftAction.url !== (component.submitAction?.url ?? '')) {
        changes.push(`URL: ${draftAction.url || '(empty)'}`);
      }
      if (draftAction.method !== (component.submitAction?.method ?? 'POST')) {
        changes.push(`method: ${draftAction.method}`);
      }
      if (
        draftAction.payloadFormat !==
        (component.submitAction?.payloadFormat ?? 'json')
      ) {
        changes.push(`format: ${draftAction.payloadFormat}`);
      }
    }
    if (
      JSON.stringify(draftLinkedIds) !==
      JSON.stringify(component.linkedComponentIds ?? [])
    ) {
      changes.push(`${draftLinkedIds.length} linked inputs`);
    }
    if (draftEntityId !== component.entityId) {
      const entity = entities.find(e => e.id === draftEntityId);
      changes.push(entity ? `entity: ${entity.name}` : 'entity unbound');
    }
    if (
      JSON.stringify(draftVisibleFields) !==
      JSON.stringify(component.visibleFields)
    ) {
      changes.push(`fields: ${draftVisibleFields.join(', ') || '(none)'}`);
    }
    if (draftLinkedSubmitButtonId !== component.linkedSubmitButtonId) {
      changes.push('linked submit button');
    }

    onUpdate({
      title: draftTitle,
      props: draftProps,
      submitAction: draftAction,
      linkedComponentIds: draftLinkedIds,
      entityId: draftEntityId,
      visibleFields: draftVisibleFields,
      linkedSubmitButtonId: draftLinkedSubmitButtonId,
    });

    if (changes.length > 0) {
      log('success', 'Component saved', `${compName}: ${changes.join(', ')}`);
    }
  };

  const selectedEntity = entities.find(e => e.id === draftEntityId);

  /** Templates that can supply values as form payload */
  const LINKABLE_TEMPLATES = [
    'text-input',
    'number-input',
    'text-area',
    'checkbox',
    'date-picker',
    'select-dropdown',
  ];

  /** Templates that support entity/data binding */
  const DATA_BINDABLE_TEMPLATES = [
    // Form inputs - bind to entity fields
    'text-input',
    'number-input',
    'text-area',
    'checkbox',
    'date-picker',
    'select-dropdown',
    // Data display components
    'list-table',
    'detail-card',
    'stat-card',
    'header-text',
    // Relation components
    'relation',
    // Forms
    'entity-form',
    // Content components that can display entity data
    'paragraph',
    'link',
    'image',
    'list',
    'code-block',
    'blockquote',
    'badge',
    'card',
    // Media components that can use entity fields as source
    'video',
    'iframe',
  ];

  const supportsDataBinding = DATA_BINDABLE_TEMPLATES.includes(
    component.template,
  );

  const entityLinked =
    Boolean(draftEntityId || component.entityId) && supportsDataBinding;

  const isActionButton = component.template === 'button';
  const actionType = (component.props?.actionType as string) ?? 'none';
  const hasAction = actionType === 'http' || actionType === 'code';

  /** Input components on the same page that can be linked to this button */
  const linkableComponents = siblingComponents.filter(
    c => c.id !== component.id && LINKABLE_TEMPLATES.includes(c.template),
  );

  const toggleLink = (compId: string) => {
    const next = draftLinkedIds.includes(compId)
      ? draftLinkedIds.filter(x => x !== compId)
      : [...draftLinkedIds, compId];
    setDraftLinkedIds(next);
  };

  const updateDraftAction = (patch: Partial<SubmitAction>) =>
    setDraftAction(prev => ({ ...prev, ...patch }) as SubmitAction);

  const singleFieldComponent = [
    'text-input',
    'number-input',
    'checkbox',
    'date-picker',
    'text-area',
    'select-dropdown',
  ].includes(component.template);

  const compatibleFieldTypes: Record<string, string[]> = {
    'text-input': ['string', 'uuid'],
    'number-input': ['number'],
    checkbox: ['boolean'],
    'date-picker': ['date'],
    'text-area': ['string', 'json'],
    'select-dropdown': ['enum', 'string', 'boolean'],
  };
  const allowedTypes = compatibleFieldTypes[component.template];

  const style = {
    position: 'absolute' as const,
    left: component.position?.x || 0,
    top: component.position?.y || 0,
    width: component.size?.width || 300,
    minHeight: component.size?.height || 60,
    zIndex: isDragging ? 100 : isFocused ? 50 : 10,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  const startResizing = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = component.size?.width || 300;
    const startHeight = containerRef.current?.offsetHeight || 120;
    const startPosX = component.position?.x || 0;
    const startPosY = component.position?.y || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let nextWidth = startWidth;
      let nextHeight = startHeight;
      let nextPosX = startPosX;
      let nextPosY = startPosY;

      if (direction.includes('right')) {
        nextWidth = Math.max(150, startWidth + (moveEvent.clientX - startX));
      }
      if (direction.includes('left')) {
        const delta = moveEvent.clientX - startX;
        nextWidth = Math.max(150, startWidth - delta);
        if (nextWidth > 150) {
          nextPosX = startPosX + delta;
        }
      }
      if (direction.includes('bottom')) {
        nextHeight = Math.max(100, startHeight + (moveEvent.clientY - startY));
      }
      if (direction.includes('top')) {
        const delta = moveEvent.clientY - startY;
        nextHeight = Math.max(100, startHeight - delta);
        if (nextHeight > 100) {
          nextPosY = startPosY + delta;
        }
      }

      onUpdate({
        size: { width: nextWidth, height: nextHeight },
        position: { x: nextPosX, y: nextPosY },
      });
    };

    const onMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={node => {
        setDraggableRef(node);
        setDroppableRef(node);
        containerRef.current = node;
      }}
      data-component-id={id}
      data-entity-linked={entityLinked ? 'true' : 'false'}
      data-entity-id={component.entityId ?? draftEntityId ?? ''}
      data-entity-name={selectedEntity?.name ?? ''}
      style={style}
      onPointerDown={onFocus}
      className={`group rounded-xl border-2 transition-all flex flex-col overflow-hidden ${
        entityLinked ? 'border-l-[6px] border-l-amber-500 pl-3' : ''
      } ${
        isDragging
          ? 'border-blue-500 shadow-2xl scale-[1.01] z-50'
          : isLinkHovered || isDropOver
          ? 'border-amber-500 ring-4 ring-amber-500/20 shadow-lg'
          : isResizing
          ? 'border-blue-400 shadow-lg z-50'
          : showSettings
          ? 'border-blue-300 dark:border-blue-800 bg-white dark:bg-zinc-900 shadow-md'
          : selectedEntity
          ? 'border-amber-400 dark:border-amber-600 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md'
      } p-5 pointer-events-auto`}
    >
      {/* Drop indicator when dragging entity/field over */}
      {(isLinkHovered || isDropOver) && (
        <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center pointer-events-none z-30 rounded-lg">
          <div className="bg-amber-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
            <Database size={14} />
            Drop to Link Data
          </div>
        </div>
      )}

      {/* Resize Handles - Edges and Corners */}
      {!isDragging && (
        <>
          {/* Edges - Larger hit areas */}
          <div
            onMouseDown={e => startResizing(e, 'right')}
            className="absolute top-0 -right-1 w-3 h-full cursor-ew-resize hover:bg-blue-400/20 z-40"
          />
          <div
            onMouseDown={e => startResizing(e, 'left')}
            className="absolute top-0 -left-1 w-3 h-full cursor-ew-resize hover:bg-blue-400/20 z-40"
          />
          <div
            onMouseDown={e => startResizing(e, 'bottom')}
            className="absolute -bottom-1 left-0 w-full h-3 cursor-ns-resize hover:bg-blue-400/20 z-40"
          />
          <div
            onMouseDown={e => startResizing(e, 'top')}
            className="absolute -top-1 left-0 w-full h-3 cursor-ns-resize hover:bg-blue-400/20 z-40"
          />

          {/* Corners */}
          <div
            onMouseDown={e => startResizing(e, 'bottom-right')}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end p-1"
          >
            <div className="w-3 h-3 border-r-2 border-b-2 border-zinc-300 group-hover:border-blue-500 transition-colors rounded-br-sm" />
          </div>
        </>
      )}

      {/* Developer Controls Bar - sits above component content */}
      <div className="flex items-center gap-1 mb-2 overflow-hidden flex-wrap opacity-100">
        <div
          {...attributes}
          {...listeners}
          className="cursor-move flex items-center justify-center h-8 w-8 shrink-0"
          title="Move"
        >
          <GripVertical size={18} className="text-zinc-300" />
        </div>

        {selectedEntity && !(isActionButton && hasAction) && (
          <div className="flex min-w-0 max-w-[min(100%,320px)] items-center gap-1.5 rounded-lg border-2 border-amber-400 bg-amber-100/90 px-2.5 py-1.5 text-amber-950 shadow-sm dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100">
            <Link2 size={14} className="shrink-0 text-amber-700 dark:text-amber-300" />
            <span className="text-xs font-bold truncate">{selectedEntity.name}</span>
            {draftVisibleFields.length > 0 && (
              <span className="text-[10px] font-mono font-semibold text-amber-800/90 dark:text-amber-200/90 truncate">
                · {draftVisibleFields.join(', ')}
              </span>
            )}
          </div>
        )}

        {isActionButton && hasAction && draftLinkedIds.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 animate-in fade-in zoom-in duration-300 shrink-0">
            <Link2 size={12} className="shrink-0" />
            <span className="text-[10px] font-bold whitespace-nowrap">
              {draftLinkedIds.length} input
              {draftLinkedIds.length !== 1 ? 's' : ''} linked
            </span>
          </div>
        )}

        {isActionButton && hasAction && draftAction.url && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 animate-in fade-in zoom-in duration-300 max-w-[180px]">
            <Zap size={12} className="shrink-0" />
            <span className="text-[10px] font-bold truncate">
              {draftAction.method} {draftAction.url}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={saveChanges}
            disabled={!hasUnsavedChanges}
            className={`h-7 px-2 text-[10px] rounded-full transition-all shrink-0 ${
              hasUnsavedChanges
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed opacity-50'
            }`}
            title={hasUnsavedChanges ? 'Save changes' : 'No changes to save'}
          >
            <Save size={12} className="mr-1" />
            Save
          </Button>
          {supportsDataBinding && (
            <Button
              variant={showDataBinding ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => {
                setShowDataBinding(!showDataBinding);
                setShowSettings(false);
              }}
              className={`h-8 w-8 p-0 rounded-full shrink-0 ${
                showDataBinding
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'text-amber-500 hover:bg-amber-50'
              }`}
              title="Data Binding"
            >
              <Wrench size={18} />
            </Button>
          )}
          <Button
            variant={showSettings ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowDataBinding(false);
            }}
            className="h-8 w-8 p-0 rounded-full shrink-0"
            title="Component Settings"
          >
            <Settings2 size={20} />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 rounded-full shrink-0"
            title="Delete Component"
          >
            <Trash2 size={20} />
          </Button>
        </div>
      </div>

      {supportsDataBinding && entityLinked && (
        <div className="mb-3 rounded-lg border-2 border-amber-400/80 bg-gradient-to-r from-amber-100/95 to-amber-50/40 px-3 py-2.5 shadow-sm dark:border-amber-600 dark:from-amber-950/60 dark:to-amber-950/20">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-amber-950 dark:text-amber-200">
            <Link2 size={14} className="text-amber-700 dark:text-amber-400" />
            Entity → UI
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center rounded-md bg-amber-300/90 px-2.5 py-1 text-xs font-bold text-amber-950 dark:bg-amber-700 dark:text-amber-50">
              {selectedEntity?.name ?? 'Entity'}
            </span>
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              →
            </span>
            <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
              {(component.title || component.template).replace(/-/g, ' ')}
            </span>
          </div>
          {draftVisibleFields.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="w-full text-[10px] font-semibold uppercase text-amber-800/90 dark:text-amber-300/90">
                Fields in UI
              </span>
              {draftVisibleFields.map(f => (
                <span
                  key={f}
                  className="inline-flex items-center rounded-md border-2 border-amber-500/80 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-amber-950 shadow-sm dark:border-amber-600 dark:bg-zinc-900 dark:text-amber-100"
                >
                  {f}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-amber-800/80 dark:text-amber-300/80">
              Entity linked — select fields in the wrench panel or drop field
              chips from the palette.
            </p>
          )}
        </div>
      )}

      {supportsDataBinding &&
        !draftEntityId &&
        !component.entityId && (
          <div className="mb-3 rounded-lg border-2 border-dashed border-amber-400/70 bg-amber-50/80 px-3 py-2.5 text-center dark:border-amber-700 dark:bg-amber-950/30">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
              Not linked to entity data
            </p>
            <p className="mt-1 text-[11px] leading-snug text-amber-800/90 dark:text-amber-200/85">
              Drag an entity or field from the palette onto this block, or open
              the{' '}
              <span className="rounded bg-amber-200/90 px-1 font-bold dark:bg-amber-800/80">
                wrench
              </span>{' '}
              to connect.
            </p>
          </div>
        )}

      {/* Component Content - same as preview, but with editable labels */}
      <div className="flex-1">
        <ComponentRenderer
          component={{ ...component, title: draftTitle, props: draftProps }}
          entities={entities}
          siblingComponents={siblingComponents}
          editable
          onTitleChange={setDraftTitle}
          onValueChange={value => setDraftProps(prev => ({ ...prev, value }))}
        />
      </div>

      {/* Available fields hint - shown for text interpolation components (not input fields) */}
      {selectedEntity &&
        draftVisibleFields.length > 0 &&
        !(isActionButton && hasAction) &&
        !singleFieldComponent && (
          <div className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span className="mr-1">Available fields:</span>
            {draftVisibleFields.map((field, idx) => (
              <span key={field}>
                <button
                  onClick={() => {
                    const token = `{${field}}`;
                    if (!draftTitle.includes(token)) {
                      setDraftTitle(
                        draftTitle ? `${draftTitle} ${token}` : token,
                      );
                    }
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline cursor-pointer font-medium"
                  title={`Click to insert {${field}} into title`}
                >
                  {`{${field}}`}
                </button>
                {idx < draftVisibleFields.length - 1 && (
                  <span className="mx-1">·</span>
                )}
              </span>
            ))}
          </div>
        )}

      {/* Bound field indicator for input components */}
      {selectedEntity && draftVisibleFields.length > 0 && singleFieldComponent && (
        <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <span className="font-medium">Bound to:</span>
          <code className="bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
            {selectedEntity.name}.{draftVisibleFields[0]}
          </code>
        </div>
      )}

      {/* Entity connection hint — only for data-bindable templates */}
      {!selectedEntity && supportsDataBinding && (
        <button
          onClick={() => {
            setShowDataBinding(true);
            setShowSettings(false);
          }}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
        >
          <Database size={14} />
          <span className="text-[11px] font-semibold">
            Drop entity here or click to connect data
          </span>
        </button>
      )}

      {/* Data Binding Panel — only for data-bindable templates */}
      {showDataBinding && supportsDataBinding && (
        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/30 animate-in slide-in-from-top-1 duration-200">
          <p className="text-[10px] text-amber-800/90 dark:text-amber-200/90 mb-3 leading-relaxed">
            Choose an entity, then toggle fields below. You can also drag an
            entity or field from the left palette onto this component.
          </p>
          <div className="mb-3">
            <Select
              label="Connected Entity"
              value={draftEntityId || ''}
              onChange={e => {
                setDraftEntityId(e.target.value || null);
                setDraftVisibleFields([]);
              }}
              options={[
                { value: '', label: 'No Entity' },
                ...entities.map(e => ({ value: e.id, label: e.name })),
              ]}
              className="h-7 text-[10px]"
            />
          </div>
          {selectedEntity ? (
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                <Database size={10} /> {selectedEntity.name} Fields
                {singleFieldComponent && (
                  <span className="text-zinc-400 normal-case font-normal ml-1">
                    (pick one)
                  </span>
                )}
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedEntity.fields.map(f => {
                  const active = draftVisibleFields.includes(f.name);
                  const typeMatch =
                    !allowedTypes || allowedTypes.includes(f.type);

                  return (
                    <button
                      key={f.name}
                      disabled={!typeMatch}
                      onClick={() => {
                        if (!typeMatch) return;
                        if (singleFieldComponent) {
                          setDraftVisibleFields(active ? [] : [f.name]);
                        } else {
                          const next = active
                            ? draftVisibleFields.filter(n => n !== f.name)
                            : [...draftVisibleFields, f.name];
                          setDraftVisibleFields(next);
                        }
                      }}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-all ${
                        !typeMatch
                          ? 'bg-zinc-50 text-zinc-300 dark:bg-zinc-900 dark:text-zinc-600 cursor-not-allowed line-through'
                          : active
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-amber-100'
                      }`}
                      title={
                        !typeMatch
                          ? `${
                              f.type
                            } incompatible with ${component.template.replace(
                              /-/g,
                              ' ',
                            )}`
                          : f.type
                      }
                    >
                      {f.name}
                      {!typeMatch && (
                        <span className="ml-0.5 opacity-60">({f.type})</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {allowedTypes && (
                <p className="text-[8px] text-zinc-400 italic">
                  Accepts: {allowedTypes.join(', ')} fields
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900/30 animate-in slide-in-from-top-1 duration-200">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
            Type: {component.template.replace(/-/g, ' ')}
          </span>
          <div className="space-y-3">
            <ComponentSettingsFields
              defs={
                component.template === 'button'
                  ? filterButtonSettings(
                      COMPONENT_SETTINGS.button ?? [],
                      draftProps,
                    )
                  : COMPONENT_SETTINGS[component.template] ?? []
              }
              props={draftProps}
              onChange={patch => setDraftProps(prev => ({ ...prev, ...patch }))}
              siblingComponents={siblingComponents}
            />

            {/* Button with action: linked inputs */}
            {isActionButton && hasAction && (
              <>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block mb-2">
                    Linked Input Components
                  </span>
                  {linkableComponents.length === 0 ? (
                    <p className="text-[10px] text-zinc-400 italic">
                      No input components on this page yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {linkableComponents.map(c => {
                        const active = draftLinkedIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleLink(c.id)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all ${
                              active
                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 hover:border-blue-300'
                            }`}
                          >
                            {c.title || c.template}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* HTTP action settings */}
                {actionType === 'http' && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">
                      HTTP Action
                    </span>

                    {apiPaths.length > 0 && (
                      <Select
                        label="Pick project path"
                        value={
                          apiPaths.some(
                            ap =>
                              `/api/${projectSlug}${ap.path}` ===
                                draftAction.url || ap.path === draftAction.url,
                          )
                            ? draftAction.url
                            : ''
                        }
                        onChange={e => {
                          if (!e.target.value) {
                            updateDraftAction({ url: '' });
                            return;
                          }
                          const ap = apiPaths.find(
                            a =>
                              `/api/${projectSlug}${a.path}` === e.target.value,
                          );
                          updateDraftAction({
                            url: e.target.value,
                            method:
                              ap?.operations[0]?.method ?? draftAction.method,
                          });
                        }}
                        options={[
                          { value: '', label: '— custom URL —' },
                          ...apiPaths.flatMap(ap =>
                            ap.operations.map(op => ({
                              value: `/api/${projectSlug}${ap.path}`,
                              label: `${op.method} /api/${projectSlug}${ap.path}`,
                            })),
                          ),
                        ]}
                        className="text-xs"
                      />
                    )}

                    <Select
                      label="HTTP Method"
                      value={draftAction.method}
                      onChange={e =>
                        updateDraftAction({
                          method: e.target.value as SubmitAction['method'],
                        })
                      }
                      options={[
                        { value: 'POST', label: 'POST' },
                        { value: 'PUT', label: 'PUT' },
                        { value: 'PATCH', label: 'PATCH' },
                        { value: 'GET', label: 'GET' },
                        { value: 'DELETE', label: 'DELETE' },
                      ]}
                      className="text-xs"
                    />
                    <Input
                      label="URL / Path"
                      value={draftAction.url}
                      onChange={e => updateDraftAction({ url: e.target.value })}
                      placeholder="e.g. /api/users or https://example.com/endpoint"
                      className="text-xs"
                    />
                    <Select
                      label="Payload Format"
                      value={draftAction.payloadFormat}
                      onChange={e =>
                        updateDraftAction({
                          payloadFormat: e.target
                            .value as SubmitAction['payloadFormat'],
                        })
                      }
                      options={[
                        { value: 'json', label: 'JSON' },
                        { value: 'form-data', label: 'Form Data' },
                      ]}
                      className="text-xs"
                    />

                    {/* Payload Mode */}
                    <Select
                      label="Payload Source"
                      value={draftAction.payloadMode ?? 'linked'}
                      onChange={e =>
                        updateDraftAction({
                          payloadMode: e.target
                            .value as SubmitAction['payloadMode'],
                        })
                      }
                      options={[
                        {
                          value: 'linked',
                          label: 'Linked inputs only',
                        },
                        {
                          value: 'entities',
                          label: 'Entity data',
                        },
                        {
                          value: 'custom',
                          label: 'Custom JSON payload',
                        },
                        {
                          value: 'merged',
                          label: 'Merged (inputs + entities + custom)',
                        },
                      ]}
                      className="text-xs"
                    />

                    {/* Entity picker — shown for 'entities' and 'merged' modes */}
                    {(draftAction.payloadMode === 'entities' ||
                      draftAction.payloadMode === 'merged') && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">
                          Include entity data
                        </span>
                        {entities.length === 0 ? (
                          <p className="text-[10px] text-zinc-400 italic">
                            No entities defined yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {entities.map(entity => {
                              const selected = (
                                draftAction.payloadEntityIds ?? []
                              ).includes(entity.id);
                              return (
                                <button
                                  key={entity.id}
                                  onClick={() => {
                                    const current =
                                      draftAction.payloadEntityIds ?? [];
                                    const next = selected
                                      ? current.filter(id => id !== entity.id)
                                      : [...current, entity.id];
                                    updateDraftAction({
                                      payloadEntityIds: next,
                                    });
                                  }}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all ${
                                    selected
                                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 hover:border-amber-300'
                                  }`}
                                >
                                  {entity.name}
                                  <span className="ml-1 opacity-60">
                                    ({entity.fields.length})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {(draftAction.payloadEntityIds ?? []).length > 0 && (
                          <div className="text-[9px] text-zinc-400 mt-1">
                            Fields:{' '}
                            {entities
                              .filter(e =>
                                (draftAction.payloadEntityIds ?? []).includes(
                                  e.id,
                                ),
                              )
                              .flatMap(e =>
                                e.fields.map(f => `${e.name}.${f.name}`),
                              )
                              .join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom JSON editor — shown for 'custom' and 'merged' modes */}
                    {(draftAction.payloadMode === 'custom' ||
                      draftAction.payloadMode === 'merged') && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-green-500 uppercase tracking-wider block">
                          Custom JSON Payload
                        </span>
                        <Textarea
                          value={draftAction.customPayload ?? '{\n  \n}'}
                          onChange={e =>
                            updateDraftAction({
                              customPayload: e.target.value,
                            })
                          }
                          placeholder='{\n  "key": "value"\n}'
                          rows={5}
                          className="text-xs font-mono"
                        />
                        {draftAction.customPayload &&
                          (() => {
                            try {
                              JSON.parse(draftAction.customPayload);
                              return (
                                <p className="text-[9px] text-green-500 flex items-center gap-1">
                                  ✓ Valid JSON
                                </p>
                              );
                            } catch {
                              return (
                                <p className="text-[9px] text-red-500 flex items-center gap-1">
                                  ✗ Invalid JSON — will be ignored at runtime
                                </p>
                              );
                            }
                          })()}
                        {draftAction.payloadMode === 'merged' && (
                          <p className="text-[8px] text-zinc-400 italic">
                            Merged order: linked inputs → entity data → custom
                            JSON (later keys overwrite earlier ones)
                          </p>
                        )}
                      </div>
                    )}

                    <Select
                      label="Show response in..."
                      value={draftAction.responseViewId ?? ''}
                      onChange={e =>
                        updateDraftAction({
                          responseViewId: e.target.value || undefined,
                        })
                      }
                      options={[
                        { value: '', label: '— None —' },
                        ...siblingComponents
                          .filter(c => c.template === 'response-view')
                          .map(c => ({
                            value: c.id,
                            label: c.title || 'Response View',
                          })),
                      ]}
                      className="text-xs"
                    />
                  </div>
                )}
              </>
            )}

            {/* Response view: linked button */}
            {component.template === 'response-view' && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">
                  Action Source
                </span>
                <Select
                  label="Linked Button"
                  value={draftLinkedSubmitButtonId ?? ''}
                  onChange={e =>
                    setDraftLinkedSubmitButtonId(e.target.value || undefined)
                  }
                  options={[
                    { value: '', label: '— None —' },
                    ...siblingComponents
                      .filter(c => c.template === 'button')
                      .map(c => ({
                        value: c.id,
                        label: c.title || 'Button',
                      })),
                  ]}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

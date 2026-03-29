'use client';
import {
  Database,
  Layers,
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  List,
  Save,
} from 'lucide-react';
import { previewValueForField } from '@/lib/entityFieldPreview';

import { usePageRuntime } from '@/components/designer/PageRuntimeContext';
import { DraggableItem } from './DraggableItem';
import { Button, Card } from '@/components/ui';
import {
  sidebarInteractiveTileClass,
  sidebarInteractiveTileLabelClass,
  sidebarTileGridClass,
  sidebarTileGroupClass,
} from '@/lib/swaggenSidebarStyles';
import { useState } from 'react';
import type { UIComponentTemplate, Entity } from '@/types/project';
import { useProjectStore, ENTITY_TEMPLATE_PACKS } from '@/store/projectStore';

interface ComponentPaletteProps {
  entities: Entity[];
  templates: { value: UIComponentTemplate; label: string; group?: string }[];
  /** Narrow palette beside free-form canvas vs full width inside Swaggen editor left rail */
  variant?: 'floating' | 'embedded';
  /** When false, only entities & fields (widgets live in the editor sidebar) */
  showComponentTemplates?: boolean;
  /** When true (with PageRuntimeProvider), field rows are editable and sync the canvas */
  interactiveFieldValues?: boolean;
  /**
   * When set, fields render as buttons: click inserts `{field}` / binding into the
   * selected canvas layer. Drag-to-bind on fields is disabled in this mode.
   */
  onFieldInsert?: (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => void;
  /** Writes current input values into the page (e.g. `previewEntityValues`) */
  onSaveFieldValues?: () => void;
  saveFieldValuesDisabled?: boolean;
}

export function ComponentPalette({
  entities,
  templates,
  variant = 'floating',
  showComponentTemplates = true,
  interactiveFieldValues = false,
  onFieldInsert,
  onSaveFieldValues,
  saveFieldValuesDisabled = false,
}: ComponentPaletteProps) {
  const { getValue, setValue } = usePageRuntime();
  const [expandedEntities, setExpandedEntities] = useState<
    Record<string, boolean>
  >({});
  const [showTemplates, setShowTemplates] = useState(entities.length === 0);

  const toggleEntity = (id: string) => {
    setExpandedEntities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash size={10} />;
      case 'boolean':
        return <ToggleLeft size={10} />;
      case 'date':
        return <Calendar size={10} />;
      case 'enum':
        return <List size={10} />;
      default:
        return <Type size={10} />;
    }
  };

  // Group templates by their category
  const groupedTemplates = templates.reduce((acc, tpl) => {
    const group = tpl.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(tpl);
    return acc;
  }, {} as Record<string, typeof templates>);

  return (
    <div
      className={
        variant === 'embedded'
          ? 'flex flex-col gap-6 w-full min-w-0 shrink-0 max-h-[min(52vh,560px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800'
          : 'flex flex-col gap-6 w-80 shrink-0 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800'
      }
    >
      {/* Templates Section */}
      {showComponentTemplates && (
      <div className="space-y-4">
        {Object.entries(groupedTemplates).map(([group, tpls]) => (
          <div key={group} className={sidebarTileGroupClass}>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <Layers
                size={14}
                className={
                  group === 'Form'
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-violet-600 dark:text-violet-300'
                }
              />
              {group}
            </div>
            <div className={sidebarTileGridClass}>
              {tpls.map(tpl => (
                <DraggableItem
                  key={tpl.value}
                  id={`template-${tpl.value}`}
                  type="template"
                  data={{ template: tpl.value, label: tpl.label }}
                >
                  <div className={sidebarInteractiveTileClass}>
                    <span className={sidebarInteractiveTileLabelClass}>
                      {tpl.label}
                    </span>
                  </div>
                </DraggableItem>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      {interactiveFieldValues && onSaveFieldValues && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-3 dark:border-violet-900/45 dark:bg-violet-950/35">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            Field values
          </p>
          <Button
            type="button"
            className="h-9 w-full gap-2 text-xs"
            disabled={saveFieldValuesDisabled}
            title="Save widget and palette inputs with this page"
            onClick={onSaveFieldValues}
          >
            <Save size={14} strokeWidth={2.25} />
            Save values to page
          </Button>
          <p className="mt-2 text-[10px] leading-snug text-violet-900/70 dark:text-violet-200/75">
            Persists what you typed in inputs and the entity field list so preview
            and publish match.
          </p>
        </div>
      )}

      {/* Entities Section */}
      <div className="space-y-4">
        <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <Database size={14} className="text-amber-500" />
            Data Entities & Fields
          </div>

          {entities.length > 0 && (
            <div className="space-y-2">
              {entities.map(entity => {
                const isExpanded = expandedEntities[entity.id];
                return (
                  <div key={entity.id} className="space-y-1">
                    <DraggableItem
                      id={`entity-${entity.id}`}
                      type="entity"
                      data={{ entityId: entity.id, name: entity.name }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleEntity(entity.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleEntity(entity.id);
                          }
                        }}
                        className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-400 transition-all group cursor-pointer select-none"
                      >
                        <span className="text-zinc-400 group-hover:text-zinc-600 p-1 -m-1">
                          {isExpanded ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                        </span>
                        <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-amber-600">
                          <Database size={10} />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate flex-1">
                          {entity.name}
                        </span>
                      </div>
                    </DraggableItem>

                    {isExpanded && (
                      <div className="pl-6 space-y-2 mt-1 animate-in slide-in-from-top-1 duration-200">
                        {entity.fields.map(field =>
                          onFieldInsert ? (
                            <div
                              key={`${entity.id}-${field.name}`}
                              className="flex flex-col gap-1.5"
                            >
                              <div className="flex min-h-10 touch-manipulation items-center gap-2 rounded-lg border border-amber-200/90 bg-white px-2 py-1.5 dark:border-amber-900/50 dark:bg-zinc-900/80">
                                <span
                                  className="shrink-0 text-amber-500"
                                  aria-hidden
                                >
                                  {getFieldIcon(field.type)}
                                </span>
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 truncate text-left font-mono text-[11px] font-semibold text-amber-900 underline-offset-2 hover:underline dark:text-amber-100"
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onFieldInsert(
                                      entity.id,
                                      field.name,
                                      field.type,
                                    );
                                  }}
                                  title={`Add {${field.name}} to selected layer content`}
                                >
                                  {field.name}
                                </button>
                                <span
                                  className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                  aria-hidden
                                >
                                  {`{${field.name}}`}
                                </span>
                              </div>
                              {interactiveFieldValues && (
                                <input
                                  type="text"
                                  inputMode={
                                    field.type === 'number'
                                      ? 'decimal'
                                      : 'text'
                                  }
                                  className="h-9 min-h-9 w-full touch-manipulation rounded border border-zinc-200 bg-white px-1.5 py-1 text-[8px] leading-tight text-zinc-700 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                                  value={getValue(entity.id, field.name)}
                                  placeholder={previewValueForField(field)}
                                  onChange={e =>
                                    setValue(
                                      entity.id,
                                      field.name,
                                      e.target.value,
                                    )
                                  }
                                />
                              )}
                            </div>
                          ) : (
                            <DraggableItem
                              key={`${entity.id}-${field.name}`}
                              id={`field-${entity.id}-${field.name}`}
                              type="field"
                              data={{
                                entityId: entity.id,
                                fieldName: field.name,
                                fieldType: field.type,
                              }}
                            >
                              <div className="flex w-full items-center gap-2 p-1.5 rounded border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-amber-300 hover:shadow-sm text-[9px] text-zinc-500 transition-colors">
                                <span className="shrink-0 text-amber-500/50">
                                  {getFieldIcon(field.type)}
                                </span>
                                <span className="shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                                  {field.name}
                                </span>
                                {interactiveFieldValues ? (
                                  <div
                                    className="min-w-0 flex-1"
                                    onPointerDown={e => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      inputMode={
                                        field.type === 'number'
                                          ? 'decimal'
                                          : 'text'
                                      }
                                      className="h-9 min-h-9 w-full touch-manipulation rounded border border-zinc-200 bg-white px-1.5 py-1 text-[8px] leading-tight text-zinc-700 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                                      value={getValue(entity.id, field.name)}
                                      placeholder={previewValueForField(field)}
                                      onChange={e =>
                                        setValue(
                                          entity.id,
                                          field.name,
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                ) : (
                                  <span
                                    className="min-w-0 flex-1 truncate text-right text-[8px] leading-tight text-zinc-400 dark:text-zinc-500"
                                    title={previewValueForField(field)}
                                  >
                                    {previewValueForField(field)}
                                  </span>
                                )}
                              </div>
                            </DraggableItem>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Template Packs */}
          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 w-full text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              {showTemplates ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              Add Template Entities
            </button>
            {showTemplates && (
              <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                {ENTITY_TEMPLATE_PACKS.map(pack => {
                  const existingNames = new Set(entities.map(e => e.name));
                  const alreadyAdded = pack.entities.every(e =>
                    existingNames.has(e.name),
                  );
                  return (
                    <button
                      key={pack.key}
                      disabled={alreadyAdded}
                      onClick={() =>
                        useProjectStore.getState().addEntityTemplate(pack.key)
                      }
                      className={`w-full text-left p-2 rounded-lg border transition-all ${
                        alreadyAdded
                          ? 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-50 cursor-not-allowed'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-400 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{pack.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 block">
                            {pack.label}
                            {alreadyAdded && (
                              <span className="ml-1 text-green-500 font-normal">
                                ✓
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] text-zinc-400 block truncate">
                            {pack.description}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-400 shrink-0">
                          {pack.entities.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

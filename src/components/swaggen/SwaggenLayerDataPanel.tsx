'use client';

import { Input, Select } from '@/components/ui';
import { EntityFieldPreview } from '@/components/designer/EntityFieldPreview';
import { ComponentSettingsFields } from '@/components/designer/ComponentSettingsFields';
import { COMPONENT_SETTINGS } from '@/components/designer/componentSettingsConfig';
import type { SwaggenElement } from '@/types/swaggenCanvas';
import type {
  Entity,
  SubmitAction,
  UIComponent,
  UIComponentTemplate,
} from '@/types/project';

function mergeWidgetSubmitAction(
  prev: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    method: 'POST',
    url: '',
    payloadFormat: 'json',
    ...(prev ?? {}),
    ...patch,
  };
}

const LINKABLE_WIDGET_TEMPLATES: UIComponentTemplate[] = [
  'text-input',
  'number-input',
  'checkbox',
  'date-picker',
  'text-area',
  'select-dropdown',
];

interface SwaggenLayerDataPanelProps {
  selected: SwaggenElement | undefined;
  entities: Entity[];
  siblingUiComponents: UIComponent[];
  updateElement: (id: string, patch: Partial<SwaggenElement>) => void;
  /** When true, field samples are bound to page runtime (designer edit mode, with PageRuntimeProvider) */
  interactiveFieldPreview?: boolean;
  /** Click field name in preview to insert token into selected layer */
  onFieldNameClick?: (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => void;
}

export function SwaggenLayerDataPanel({
  selected,
  entities,
  siblingUiComponents,
  updateElement,
  interactiveFieldPreview = false,
  onFieldNameClick,
}: SwaggenLayerDataPanelProps) {
  if (!selected) return null;

  if (selected.kind === 'text' || selected.kind === 'image') {
    const db = selected.dataBinding ?? {
      entityId: null as string | null,
      visibleFields: [] as string[],
    };
    const ent = entities.find(e => e.id === db.entityId);
    return (
      <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
          Data binding
        </p>
        <Select
          label="Entity"
          value={db.entityId ?? ''}
          onChange={e => {
            const v = e.target.value;
            const prev = db.entityId;
            updateElement(selected.id, {
              dataBinding: {
                entityId: v || null,
                visibleFields:
                  v && v === prev ? db.visibleFields : v ? [] : [],
              },
            });
          }}
          options={[
            { value: '', label: '— None —' },
            ...entities.map(en => ({
              value: en.id,
              label: en.name,
            })),
          ]}
          className="text-xs"
        />
        {db.entityId && ent && (
          <>
            <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
              Preview lists every field — click a name to insert. Change entity
              above to relink; edit text in the <strong>Text → Content</strong>{' '}
              box to remove or change tokens.
            </p>
            <Input
              label="Fields (comma-separated)"
              placeholder="Use {fieldName} in text for each"
              value={db.visibleFields.join(', ')}
              onChange={e => {
                const fields = e.target.value
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
                updateElement(selected.id, {
                  dataBinding: { ...db, visibleFields: fields },
                });
              }}
              className="text-xs"
            />
            <EntityFieldPreview
              entity={ent}
              interactive={interactiveFieldPreview}
              onFieldNameClick={onFieldNameClick}
            />
          </>
        )}
      </div>
    );
  }

  if (selected.kind === 'widget' && selected.widget) {
    const w = selected.widget;
    const tpl = w.template as UIComponentTemplate;
    const defs = COMPONENT_SETTINGS[tpl] ?? [];
    const ent = entities.find(e => e.id === w.entityId);
    /** Actions use linked inputs + HTTP/code — not the widget's own entityId (see ButtonRenderer). */
    const skipEntityBinding = tpl === 'button';

    return (
      <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
          {skipEntityBinding ? 'Widget' : 'Widget &amp; data'}
        </p>
        <Input
          label="Title"
          value={w.title}
          onChange={e =>
            updateElement(selected.id, {
              widget: { ...w, title: e.target.value },
            })
          }
          className="text-xs"
        />
        {skipEntityBinding ? (
          <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
            Buttons do not bind to an entity. Use <strong>HTTP &amp; linked inputs</strong>{' '}
            below to send field values from text inputs and other controls on the page.
          </p>
        ) : (
          <>
            <Select
              label="Entity"
              value={w.entityId ?? ''}
              onChange={e => {
                const v = e.target.value;
                const prev = w.entityId;
                updateElement(selected.id, {
                  widget: {
                    ...w,
                    entityId: v || null,
                    visibleFields:
                      v && v === prev ? w.visibleFields : v ? [] : [],
                  },
                });
              }}
              options={[
                { value: '', label: '— None —' },
                ...entities.map(en => ({
                  value: en.id,
                  label: en.name,
                })),
              ]}
              className="text-xs"
            />
            {w.entityId && ent && (
              <>
                <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                  All entity fields are listed below — click to bind or insert. Pick
                  another entity above to relink. Edit <strong>Title</strong> to
                  change header/stat text.
                </p>
                <Input
                  label="Visible fields (comma-separated)"
                  value={w.visibleFields.join(', ')}
                  onChange={e => {
                    const fields = e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean);
                    updateElement(selected.id, {
                      widget: { ...w, visibleFields: fields },
                    });
                  }}
                  className="text-xs"
                />
                <EntityFieldPreview
                  entity={ent}
                  interactive={interactiveFieldPreview}
                  onFieldNameClick={onFieldNameClick}
                />
              </>
            )}
          </>
        )}
        <ComponentSettingsFields
          defs={defs}
          props={w.props}
          siblingComponents={siblingUiComponents}
          onChange={patch =>
            updateElement(selected.id, {
              widget: { ...w, props: { ...w.props, ...patch } },
            })
          }
        />

        {tpl === 'button' && (
          <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              HTTP &amp; linked inputs
            </p>
            <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
              Same as the free-form designer: set method/URL when Action Type is
              HTTP. Link inputs to include their values in the request body.
            </p>
            <Select
              label="Method"
              value={
                ((w.submitAction as SubmitAction | undefined)?.method ??
                  'POST') as string
              }
              onChange={e => {
                const prev = w.submitAction as Record<string, unknown> | undefined;
                updateElement(selected.id, {
                  widget: {
                    ...w,
                    submitAction: mergeWidgetSubmitAction(prev, {
                      method: e.target.value,
                    }),
                  },
                });
              }}
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'PATCH', label: 'PATCH' },
                { value: 'DELETE', label: 'DELETE' },
              ]}
              className="text-xs"
            />
            <Input
              label="URL or path"
              placeholder="/api/…"
              value={String((w.submitAction as { url?: string } | undefined)?.url ?? '')}
              onChange={e => {
                const prev = w.submitAction as Record<string, unknown> | undefined;
                updateElement(selected.id, {
                  widget: {
                    ...w,
                    submitAction: mergeWidgetSubmitAction(prev, {
                      url: e.target.value,
                    }),
                  },
                });
              }}
              className="text-xs"
            />
            <Select
              label="Show response in"
              value={
                String(
                  (w.submitAction as { responseViewId?: string } | undefined)
                    ?.responseViewId ?? '',
                )
              }
              onChange={e => {
                const prev = w.submitAction as Record<string, unknown> | undefined;
                const v = e.target.value;
                updateElement(selected.id, {
                  widget: {
                    ...w,
                    submitAction: mergeWidgetSubmitAction(prev, {
                      responseViewId: v || undefined,
                    }),
                  },
                });
              }}
              options={[
                { value: '', label: '— None —' },
                ...siblingUiComponents
                  .filter(c => c.template === 'response-view')
                  .map(c => ({
                    value: c.id,
                    label: c.title || 'Response view',
                  })),
              ]}
              className="text-xs"
            />
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              Linked inputs
            </span>
            {siblingUiComponents.filter(
              c =>
                c.id !== selected.id &&
                LINKABLE_WIDGET_TEMPLATES.includes(c.template),
            ).length === 0 ? (
              <p className="text-[10px] text-zinc-400 italic">
                Add inputs on the canvas to link them here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {siblingUiComponents
                  .filter(
                    c =>
                      c.id !== selected.id &&
                      LINKABLE_WIDGET_TEMPLATES.includes(c.template),
                  )
                  .map(c => {
                    const active = (w.linkedComponentIds ?? []).includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const cur = w.linkedComponentIds ?? [];
                          const next = active
                            ? cur.filter(id => id !== c.id)
                            : [...cur, c.id];
                          updateElement(selected.id, {
                            widget: { ...w, linkedComponentIds: next },
                          });
                        }}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all ${
                          active
                            ? 'border-zinc-700 bg-zinc-800 text-white dark:border-zinc-500 dark:bg-zinc-200 dark:text-zinc-900'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {c.title || c.template}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

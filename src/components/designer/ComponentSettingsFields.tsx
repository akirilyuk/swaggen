'use client';

import { Input, Select } from '@/components/ui';
import { UIComponent } from '@/types/project';
import type { ComponentSettingDef } from './componentSettingsConfig';

interface ComponentSettingsFieldsProps {
  defs: ComponentSettingDef[];
  props: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  siblingComponents?: UIComponent[];
}

/**
 * Renders a list of settings fields based on config definitions.
 * Values are read from / written to `component.props`.
 */
export function ComponentSettingsFields({
  defs,
  props,
  onChange,
  siblingComponents = [],
}: ComponentSettingsFieldsProps) {
  if (defs.length === 0) return null;

  const getValue = (def: ComponentSettingDef) =>
    props[def.key] ?? def.defaultValue ?? '';

  return (
    <div className="space-y-3">
      {defs.map(def => {
        let dynamicOptions = def.options ?? [];
        if (def.key === 'linkedSubmitButtonId') {
          dynamicOptions = [
            { value: '', label: '— None —' },
            ...siblingComponents
              .filter(
                c =>
                  c.template === 'button',
              )
              .map(c => ({
                value: c.id,
                label: c.title || 'Button',
              })),
          ];
        }
        if (def.key === 'codeResponseViewId') {
          dynamicOptions = [
            { value: '', label: '— None —' },
            ...siblingComponents
              .filter(c => c.template === 'response-view')
              .map(c => ({
                value: c.id,
                label: c.title || 'Response view',
              })),
          ];
        }

        switch (def.type) {
          case 'select':
            return (
              <Select
                key={def.key}
                label={def.label}
                value={String(getValue(def))}
                onChange={e => onChange({ [def.key]: e.target.value })}
                options={dynamicOptions}
                className="text-xs"
              />
            );

          case 'text':
            return (
              <Input
                key={def.key}
                label={def.label}
                value={String(getValue(def))}
                onChange={e => onChange({ [def.key]: e.target.value })}
                placeholder={def.placeholder}
                className="text-xs"
              />
            );

          case 'number':
            return (
              <Input
                key={def.key}
                label={def.label}
                type="number"
                value={getValue(def) === '' ? '' : String(getValue(def))}
                onChange={e =>
                  onChange({
                    [def.key]:
                      e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder={def.placeholder}
                className="text-xs"
              />
            );

          case 'toggle':
            return (
              <label
                key={def.key}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={Boolean(getValue(def))}
                  onChange={e => onChange({ [def.key]: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {def.label}
                </span>
              </label>
            );

          case 'textarea':
            return (
              <div key={def.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {def.label}
                </label>
                <textarea
                  value={String(getValue(def))}
                  onChange={e => onChange({ [def.key]: e.target.value })}
                  placeholder={def.placeholder}
                  rows={def.key === 'codeAction' ? 14 : 6}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y min-h-[120px]"
                />
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

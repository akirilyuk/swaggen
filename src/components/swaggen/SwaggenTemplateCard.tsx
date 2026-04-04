'use client';

import type { SwaggenLayoutTemplateDefinition } from '@/lib/swaggenTemplatesRegistry';
import {
  getPresetDimensionsLabel,
  getPresetDisplayName,
} from '@/lib/swaggenTemplatesRegistry';

import { SwaggenTemplateThumbnail } from './SwaggenTemplateThumbnail';

interface SwaggenTemplateCardProps {
  template: SwaggenLayoutTemplateDefinition;
  selected: boolean;
  onSelect: () => void;
}

export function SwaggenTemplateCard({
  template,
  selected,
  onSelect,
}: SwaggenTemplateCardProps) {
  const dims = getPresetDimensionsLabel(template.presetId);
  const formatName = getPresetDisplayName(template.presetId);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full rounded-xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-zinc-500/40 dark:focus-visible:ring-offset-zinc-950 ${
        selected
          ? 'border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950'
          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
      }`}
    >
      <div className="p-2 pb-1">
        <SwaggenTemplateThumbnail
          presetId={template.presetId}
          preview={template.preview}
          templateName={template.name}
          templateId={template.id}
          coverAlt={`${template.name} preview`}
        />
      </div>
      <div className="space-y-1 px-2.5 pb-2.5 pt-1">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {template.name}
        </p>
        <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          {template.description}
        </p>
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="inline-flex max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {formatName}
          </span>
          <span className="text-[9px] tabular-nums text-zinc-500 dark:text-zinc-400">{dims}</span>
          {selected && (
            <span className="sr-only">This layout is applied to the canvas.</span>
          )}
        </div>
      </div>
    </button>
  );
}

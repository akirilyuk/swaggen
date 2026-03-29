'use client';

import { Check } from 'lucide-react';

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
      className={`group w-full rounded-xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 ${
        selected
          ? 'border-violet-500 bg-violet-50/90 shadow-md ring-1 ring-violet-500/20 dark:bg-violet-950/40 dark:ring-violet-400/30'
          : 'border-zinc-200 bg-white hover:border-violet-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-violet-600'
      }`}
    >
      <div className="p-2 pb-1">
        <SwaggenTemplateThumbnail
          presetId={template.presetId}
          preview={template.preview}
          templateId={template.id}
          coverAlt={`${template.name} preview`}
        />
      </div>
      <div className="space-y-1 px-2.5 pb-2.5 pt-1">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {template.name}
        </p>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {template.description}
        </p>
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="inline-flex max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {formatName}
          </span>
          <span className="text-[9px] tabular-nums text-zinc-400">{dims}</span>
          {selected && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-semibold text-violet-600 dark:text-violet-400">
              <Check size={10} strokeWidth={3} />
              Selected
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

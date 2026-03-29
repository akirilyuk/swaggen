'use client';

import {
  ChevronDown,
  ChevronRight,
  LayoutTemplate,
  Search,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  SWAGGEN_LAYOUT_TEMPLATE_CATEGORIES,
  SWAGGEN_LAYOUT_TEMPLATES,
  type SwaggenLayoutTemplateDefinition,
} from '@/lib/swaggenTemplatesRegistry';

import { SwaggenTemplateCard } from './SwaggenTemplateCard';

interface SwaggenTemplatePanelProps {
  onApply: (templateId: string) => void;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function matchesSearch(t: SwaggenLayoutTemplateDefinition, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  return (
    normalize(t.name).includes(n) ||
    normalize(t.description).includes(n) ||
    t.tags.some(tag => normalize(tag).includes(n))
  );
}

export function SwaggenTemplatePanel({ onApply }: SwaggenTemplatePanelProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return SWAGGEN_LAYOUT_TEMPLATES.filter(t => {
      if (categoryId !== 'all' && t.categoryId !== categoryId) return false;
      return matchesSearch(t, search);
    });
  }, [categoryId, search]);

  const featured = useMemo(
    () => SWAGGEN_LAYOUT_TEMPLATES.filter(t => t.featured),
    [],
  );

  const showFeatured =
    categoryId === 'all' && !normalize(search) && featured.length > 0;

  const featuredIds = useMemo(
    () => new Set(featured.map(f => f.id)),
    [featured],
  );

  const gridTemplates = useMemo(() => {
    if (!showFeatured) return filtered;
    return filtered.filter(t => !featuredIds.has(t.id));
  }, [filtered, showFeatured, featuredIds]);

  const handleApply = (id: string) => {
    setSelectedId(id);
    onApply(id);
  };

  return (
    <div className="mb-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setGalleryOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-left transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
        aria-expanded={galleryOpen}
        aria-controls="swaggen-template-gallery-panel"
        id="swaggen-template-gallery-toggle"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <LayoutTemplate size={12} aria-hidden /> Template gallery
        </span>
        {galleryOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        )}
      </button>

      {!galleryOpen && (
        <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Click <span className="font-medium text-zinc-600 dark:text-zinc-300">Template gallery</span> above to browse layouts and apply a design.
        </p>
      )}

      {galleryOpen && (
        <div
          id="swaggen-template-gallery-panel"
          role="region"
          aria-labelledby="swaggen-template-gallery-toggle"
          className="flex flex-col gap-3"
        >
      <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Layouts inspired by common{' '}
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          Canva
        </span>{' '}
        formats (original designs). Click a card to apply — the canvas resizes
        to match.
      </p>

      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
          selectedId === 'blank'
            ? 'border-violet-500 bg-violet-50/90 text-zinc-800 shadow-md ring-1 ring-violet-500/20 dark:bg-violet-950/30 dark:text-zinc-100'
            : 'border-dashed border-zinc-300 text-zinc-600 hover:border-violet-400 hover:bg-violet-50/50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-violet-500 dark:hover:bg-violet-950/20'
        }`}
        onClick={() => {
          setSelectedId('blank');
          onApply('blank');
        }}
      >
        <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
          +
        </span>
        <span>
          <span className="block font-semibold text-zinc-900 dark:text-white">
            Blank canvas
          </span>
          <span className="text-[10px] text-zinc-500">
            Keep current size · white background
          </span>
        </span>
      </button>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          aria-label="Search templates"
        />
      </div>

      <div className="flex max-h-[72px] flex-wrap gap-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => setCategoryId('all')}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
            categoryId === 'all'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          All
        </button>
        {SWAGGEN_LAYOUT_TEMPLATE_CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            title={c.description}
            onClick={() => setCategoryId(c.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
              categoryId === c.id
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="max-h-[min(520px,calc(100vh-16rem))] space-y-4 overflow-y-auto pr-1">
        {showFeatured && (
          <section>
            <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              <Sparkles size={11} /> Popular picks
            </p>
            <div className="grid grid-cols-2 gap-2">
              {featured.map(t => (
                <SwaggenTemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  onSelect={() => handleApply(t.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
            {showFeatured ? 'More templates' : 'Templates'}
            {gridTemplates.length > 0 && (
              <span className="ml-1 font-normal text-zinc-500">
                ({gridTemplates.length})
              </span>
            )}
          </p>
          {gridTemplates.length === 0 && filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-[11px] text-zinc-500 dark:border-zinc-700">
              No templates match your search. Try another keyword or category.
            </p>
          ) : gridTemplates.length === 0 && showFeatured ? (
            <p className="text-[10px] text-zinc-500">
              All matching templates are in Popular picks above.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gridTemplates.map(t => (
                <SwaggenTemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  onSelect={() => handleApply(t.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
        </div>
      )}
    </div>
  );
}

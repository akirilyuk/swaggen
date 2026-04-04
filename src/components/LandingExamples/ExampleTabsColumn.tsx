import type { LandingExample } from '@/data/landingExamples';

type Props = {
  examples: LandingExample[];
  index: number;
  setIndex: (i: number) => void;
  tabIds: string[];
  panelId: string;
};

export function ExampleTabsColumn({
  examples,
  index,
  setIndex,
  tabIds,
  panelId,
}: Props) {
  return (
    <div className="lg:w-56 lg:shrink-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Browse examples
      </p>
      <div
        role="tablist"
        aria-label="Example API blueprints"
        className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
      >
        {examples.map((item, i) => {
          const selected = i === index;
          return (
            <button
              key={item.id}
              id={tabIds[i]}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setIndex(i)}
              className={`whitespace-nowrap rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors lg:whitespace-normal ${
                selected
                  ? 'border-blue-500/60 bg-blue-600/15 text-white'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <span className="block text-xs font-normal text-zinc-500">
                {item.category}
              </span>
              {item.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

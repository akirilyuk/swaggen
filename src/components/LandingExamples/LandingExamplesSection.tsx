'use client';

import { useCallback, useId, useState } from 'react';

import { LANDING_EXAMPLES } from '@/data/landingExamples';

import { ExampleBlueprintPanel } from './ExampleBlueprintPanel';
import { ExampleCarouselControls } from './ExampleCarouselControls';
import { ExampleTabsColumn } from './ExampleTabsColumn';

/** Browsable static blueprints for the public landing page. */
export function LandingExamplesSection() {
  const baseId = useId();
  const n = LANDING_EXAMPLES.length;
  const [index, setIndex] = useState(0);

  const ex = LANDING_EXAMPLES[index];
  const tabIds = LANDING_EXAMPLES.map((e, i) => `${baseId}-tab-${e.id}-${i}`);
  const panelId = `${baseId}-examples-panel`;

  const go = useCallback(
    (delta: number) => {
      setIndex(i => (i + delta + n) % n);
    },
    [n],
  );

  return (
    <section
      className="border-y border-zinc-800/80 bg-zinc-950 py-16 sm:py-20"
      aria-labelledby={`${baseId}-examples-heading`}
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id={`${baseId}-examples-heading`}
            className="text-2xl font-bold text-white sm:text-3xl"
          >
            Example blueprints
          </h2>
          <p className="mt-3 text-zinc-400">
            Flip through real-world API shapes you could model in SwaggenNext —
            entities, relations, routes, and the kind of code the generator
            emits.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-start">
          <ExampleTabsColumn
            examples={LANDING_EXAMPLES}
            index={index}
            setIndex={setIndex}
            tabIds={tabIds}
            panelId={panelId}
          />

          <div className="min-w-0 flex-1">
            <ExampleCarouselControls index={index} total={n} onStep={go} />

            <div
              role="tabpanel"
              id={panelId}
              aria-labelledby={tabIds[index]}
              aria-live="polite"
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"
            >
              <ExampleBlueprintPanel ex={ex} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import type { LandingExample } from '@/data/landingExamples';

import { methodBadgeClass } from './methodBadgeClass';

export function ExampleBlueprintPanel({ ex }: { ex: LandingExample }) {
  return (
    <>
      <p className="text-sm font-medium text-blue-400">{ex.category}</p>
      <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
        {ex.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{ex.tagline}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Entities
          </h4>
          <ul className="mt-3 space-y-4">
            {ex.entities.map(ent => (
              <li
                key={ent.name}
                className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3"
              >
                <p className="font-mono text-sm font-semibold text-zinc-200">
                  {ent.name}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                  {ent.fields.map(f => (
                    <li key={f.name} className="flex justify-between gap-2">
                      <span className="font-mono text-zinc-300">{f.name}</span>
                      <span className="shrink-0 text-zinc-500">{f.type}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-8">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Relations
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {ex.relations.map((r, i) => (
                <li
                  key={`${r.from}-${r.to}-${i}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs sm:text-sm"
                >
                  <span className="text-zinc-200">{r.from}</span>
                  <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-500">
                    {r.label}
                  </span>
                  <span className="text-zinc-200">{r.to}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Example operations
            </h4>
            <ul className="mt-3 space-y-2">
              {ex.operations.map(op => (
                <li
                  key={`${op.method}-${op.path}`}
                  className="flex flex-col gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                >
                  <span
                    className={`inline-flex w-fit shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${methodBadgeClass(op.method)}`}
                  >
                    {op.method}
                  </span>
                  <span className="font-mono text-xs text-zinc-300">
                    {op.path}
                  </span>
                  <span className="text-xs text-zinc-500 sm:ml-auto">
                    {op.summary}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {ex.snippetTitle}
        </h4>
        <pre className="mt-3 max-h-[min(24rem,50vh)] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left text-[11px] leading-relaxed text-zinc-300 [tab-size:2] sm:text-xs">
          <code>{ex.snippet}</code>
        </pre>
      </div>
    </>
  );
}

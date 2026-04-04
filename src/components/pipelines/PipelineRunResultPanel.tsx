'use client';

import { Button, Card } from '@/components/ui';

/** Response shape from POST /api/pipelines/run */
export type PipelineRunResponse = {
  ok?: boolean;
  stopped?: boolean;
  reason?: string;
  error?: string;
  message?: string;
  steps?: Array<Record<string, unknown>>;
};

type Props = {
  pipelineName: string;
  ranAt: string;
  httpStatus: number;
  payload: PipelineRunResponse | null;
  rawJson: string | null;
  onClear: () => void;
};

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Shows structured output from the last middleware-pipeline run. */
export function PipelineRunResultPanel({
  pipelineName,
  ranAt,
  httpStatus,
  payload,
  rawJson,
  onClear,
}: Props) {
  if (!payload && !rawJson) return null;

  const ok = payload?.ok === true;
  const steps = payload?.steps ?? [];

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Last run result
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {pipelineName}
            </span>
            {' · '}
            {ranAt}
            {' · HTTP '}
            {httpStatus}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>

      {!ok && payload?.error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {String(payload.error)}
        </p>
      )}

      {payload?.message && (
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {payload.message}
        </p>
      )}

      {payload?.stopped && payload.reason && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {payload.reason}
        </p>
      )}

      {steps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Middleware chain steps
          </h3>
          {steps.map((step, i) => (
            <div
              key={String(step.stepId ?? i)}
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                <span>{String(step.stepName ?? `Step ${i + 1}`)}</span>
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {String(step.type ?? 'middleware')}
                </span>
                <span className="text-xs font-normal text-zinc-500">
                  {String(step.middlewareCount ?? 0)} middleware(s) in chain
                </span>
              </div>
              {Array.isArray(step.errors) && step.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-red-600 dark:text-red-400">
                  {step.errors.map((err, j) => (
                    <li key={j}>{String(err)}</li>
                  ))}
                </ul>
              )}
              {step.shortCircuit != null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Short-circuit response (middleware returned NextResponse)
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[11px] leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    {formatJson(step.shortCircuit)}
                  </pre>
                </details>
              )}
              {step.ctx != null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Context (ctx) after chain
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[11px] leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    {formatJson(step.ctx)}
                  </pre>
                </details>
              )}
              {step.lastReturnValue != null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Last return value
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[11px] leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    {formatJson(step.lastReturnValue)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {rawJson && (
        <details className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Full JSON response
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-200 dark:border-zinc-700">
            {rawJson}
          </pre>
        </details>
      )}
    </Card>
  );
}

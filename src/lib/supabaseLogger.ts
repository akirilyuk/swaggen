/**
 * Configurable logger for Supabase interactions.
 *
 * Controlled via the `NEXT_PUBLIC_SUPABASE_DEBUG` environment variable:
 *   - `"true"` or `"1"` → all debug, info, warn, error logs
 *   - `"error"` → only warn + error logs (default)
 *   - `"verbose"` → all logs including query details and row counts
 *   - anything else / unset → only error + warn logs
 *
 * Usage:
 *   import { dbLogger } from './supabaseLogger';
 *   dbLogger.debug('getEntities', 'fetching for project', projectId);
 *   dbLogger.ok('createEntity', entityId);
 *   dbLogger.fail('createEntity', error.message);
 */

type LogLevel = 'verbose' | 'debug' | 'error';

function resolveLevel(): LogLevel {
  const raw = (
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SUPABASE_DEBUG
      : undefined
  )
    ?.toLowerCase()
    ?.trim();

  if (raw === 'verbose') return 'verbose';
  if (raw === 'true' || raw === '1' || raw === 'debug') return 'debug';
  return 'error';
}

const level = resolveLevel();
const isDebug = level === 'debug' || level === 'verbose';
const isVerbose = level === 'verbose';

const PREFIX = '[supabaseDb]';

/**
 * Structured logger for Supabase database operations.
 * All methods are no-ops when the corresponding log level is disabled.
 */
export const dbLogger = {
  /** Log method entry with arguments (debug + verbose only). */
  debug(method: string, ...args: unknown[]): void {
    if (!isDebug) return;
    console.log(`${PREFIX} ${method}`, ...args);
  },

  /** Log successful operation result (debug + verbose only). */
  ok(method: string, ...args: unknown[]): void {
    if (!isDebug) return;
    console.log(`${PREFIX} ✓ ${method}`, ...args);
  },

  /** Log query details and row counts (verbose only). */
  verbose(method: string, ...args: unknown[]): void {
    if (!isVerbose) return;
    console.log(`${PREFIX} ⊙ ${method}`, ...args);
  },

  /** Log warnings (always enabled). */
  warn(method: string, ...args: unknown[]): void {
    console.warn(`${PREFIX} ⚠ ${method}`, ...args);
  },

  /** Log errors (always enabled). */
  error(method: string, ...args: unknown[]): void {
    console.error(`${PREFIX} ✗ ${method}`, ...args);
  },

  /** Log operation timing (verbose only). */
  time(method: string): () => void {
    if (!isVerbose) return () => {};
    const start = performance.now();
    return () => {
      const ms = (performance.now() - start).toFixed(1);
      console.log(`${PREFIX} ⏱ ${method} ${ms}ms`);
    };
  },

  /** Current log level for external checks. */
  level,
  isDebug,
  isVerbose,
};

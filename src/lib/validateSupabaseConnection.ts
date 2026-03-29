/**
 * Node.js-only Supabase connection validation.
 *
 * This file uses Node.js APIs (process.exit, path, fs, dotenv) and must NEVER
 * be statically imported from instrumentation.ts — only dynamically via
 * `await import(...)` inside a `NEXT_RUNTIME === 'nodejs'` guard.
 *
 * The connection is configurable:
 *  1. Via environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *  2. Via the centralised `config.ts` (supabaseConfig)
 *  3. By passing an explicit `SupabaseConnectionOptions` object
 *
 * When tables are missing the migrations in `supabase/migrations/` are
 * automatically executed if a `SUPABASE_SERVICE_ROLE_KEY` is available.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

import { config } from 'dotenv';

import { supabaseConfig, validateEnvConfig } from './config';
import { publicSupabaseKeyRejectionReason } from './supabaseKeyValidation';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Options to override the default Supabase connection settings. */
export interface SupabaseConnectionOptions {
  /** Supabase project URL */
  url?: string;
  /** Supabase anon/public key */
  anonKey?: string;
  /** Table to probe when testing the connection (default: "projects") */
  probeTable?: string;
  /** Whether to auto-run migrations when tables are missing (default: true) */
  autoMigrate?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Fatal helper – logs and kills the process. */
function fatal(message: string): never {
  console.error(message);
  process.exit(1);
}

/**
 * Execute a raw SQL string against Supabase via the Management API.
 * Requires `SUPABASE_SERVICE_ROLE_KEY` because anon keys cannot run DDL.
 */
async function executeSqlViaRest(
  url: string,
  serviceKey: string,
  sql: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // The Supabase REST SQL endpoint (available on self-hosted & cloud with service key)
    const endpoint = `${url}/rest/v1/rpc/exec_sql`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (resp.ok) return { ok: true };

    const body = await resp.text();
    return { ok: false, error: body };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Read and execute all migration files from `supabase/migrations/` in order.
 */
async function runMigrations(url: string, _key: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn(
      '⚠️  SUPABASE_SERVICE_ROLE_KEY is not set — cannot auto-run migrations.',
    );
    console.warn(
      '   Add it to .env to enable auto-migration, or run them manually.',
    );
    return false;
  }

  const migrationsDir = resolve(process.cwd(), 'supabase', 'migrations');

  if (!existsSync(migrationsDir)) {
    console.warn(
      `[validateSupabase] Migrations directory not found: ${migrationsDir}`,
    );
    return false;
  }

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.warn('[validateSupabase] No migration files found.');
    return false;
  }

  console.log(`📦 Running ${files.length} migration(s)...`);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`   ▸ ${file}`);
    const result = await executeSqlViaRest(url, serviceKey, sql);
    if (!result.ok) {
      console.error(`   ✗ ${file} failed: ${result.error}`);
      return false;
    }
    console.log(`   ✓ ${file}`);
  }

  console.log('📦 All migrations applied.\n');
  return true;
}

/* ------------------------------------------------------------------ */
/*  Main validation function                                           */
/* ------------------------------------------------------------------ */

/**
 * Validates and tests the Supabase connection at startup.
 *
 * Resolution order for url / anonKey:
 *   explicit options  →  supabaseConfig (config.ts)  →  env vars directly
 */
export async function validateSupabaseConnection(
  options?: SupabaseConnectionOptions,
): Promise<void> {
  // Load env files (cover CLI/tools that only have .env.local)
  config({ path: resolve(process.cwd(), '.env') });
  config({ path: resolve(process.cwd(), '.env.local'), override: true });

  // First run centralized env validation for a clear summary
  const { missing } = validateEnvConfig();
  if (missing.length > 0) {
    console.warn(`[validateSupabase] Missing env vars: ${missing.join(', ')}`);
  }

  // Resolve url & key: explicit options → config.ts → raw env
  const url =
    options?.url || supabaseConfig.url || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    options?.anonKey ||
    supabaseConfig.anonKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const probeTable = options?.probeTable ?? 'projects';
  const autoMigrate = options?.autoMigrate ?? true;

  // Don't print secrets; indicate presence only
  console.log('supabase url set:', Boolean(url));
  console.log('supabase key set:', Boolean(key));
  console.log('\n🔌 Checking Supabase connection...');

  if (!url) {
    fatal(
      '❌ NEXT_PUBLIC_SUPABASE_URL is not set\n   Please add it to your .env file or environment',
    );
  }

  if (!key) {
    fatal(
      '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set\n   Please add it to your .env file or environment',
    );
  }

  const keyIssue = publicSupabaseKeyRejectionReason(key);
  if (keyIssue) {
    fatal(
      `❌ ${keyIssue}\n   Dashboard: https://supabase.com/dashboard/project/_/settings/api (copy "anon" / public key)`,
    );
  }

  // Test actual connection
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, key);

    const { error } = await supabase.from(probeTable).select('id').limit(1);

    if (error) {
      const errMsg =
        typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : String(error);

      // Connection works but tables are missing
      const isTableNotFound =
        errMsg.includes('relation') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('schema cache') ||
        errMsg.toLowerCase().includes('not found');

      if (isTableNotFound) {
        console.log('⚠️  Supabase connected, but tables not found.');

        if (autoMigrate) {
          const migrated = await runMigrations(url, key);
          if (migrated) {
            // Verify tables now exist
            const { error: retryError } = await supabase
              .from(probeTable)
              .select('id')
              .limit(1);
            if (retryError) {
              console.warn(
                '⚠️  Migrations ran but tables still not accessible:',
                retryError.message,
              );
              console.warn(
                '   You may need to run migrations manually in the Supabase SQL Editor.',
              );
              console.log('   Copy the SQL from: supabase/migrations/*.sql\n');
            } else {
              console.log('✅ Supabase tables created and verified\n');
              return;
            }
          } else {
            printManualMigrationInstructions();
          }
        } else {
          console.log('   Run migrations to create required tables.');
        }

        console.log('✅ Supabase connection verified (tables pending)\n');
        return;
      }

      fatal(`❌ Supabase query error: ${errMsg}\n   URL: ${url}`);
    }

    console.log('✅ Supabase connection verified\n');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fatal(
      `❌ Failed to connect to Supabase: ${message}\n   URL: ${url}\n\n   Please check your Supabase project, URL, and API key.`,
    );
  }
}

/** Print user-friendly manual migration instructions. */
function printManualMigrationInstructions(): void {
  console.warn('⚠️  Auto-migration failed. To create tables manually:');
  console.warn('   1. Go to https://supabase.com/dashboard → SQL Editor');
  console.warn(
    '   2. Paste the SQL from supabase/migrations/002_normalized_tables.sql',
  );
  console.warn(
    '   3. Paste the SQL from supabase/migrations/003_store_state_meta.sql',
  );
  console.warn('   4. Click "Run"\n');
}

/**
 * Centralised environment configuration.
 * All env vars are loaded and validated here so the rest of the codebase
 * can import typed, guaranteed values from a single source of truth.
 *
 * Next.js automatically loads env files in the following order:
 * 1. .env.local (not checked into git)
 * 2. .env.[NODE_ENV].local (e.g. .env.development.local)
 * 3. .env.[NODE_ENV] (e.g. .env.development)
 * 4. .env (default)
 *
 * Variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */

/* ------------------------------------------------------------------ */
/*  Env Files Documentation                                            */
/* ------------------------------------------------------------------ */

/**
 * Expected environment variables:
 *
 * Required:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anonymous key (safe to expose)
 *
 * Optional:
 * - NEXT_PUBLIC_BASE_URL: Base URL for the app (defaults to localhost:3000)
 * - NODE_ENV: development | production | test
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Retrieves an environment variable with optional fallback.
 * Logs a warning if the variable is missing and no fallback is provided.
 */
function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    console.warn(`[config] Missing env var: ${key}`);
  }
  return value ?? '';
}

/**
 * Retrieves a required environment variable.
 * Throws an error during build/startup if the variable is missing.
 */
function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const message = `[config] Required env var missing: ${key}`;
    console.error(message);
    // In production builds, throw to fail fast
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }
  }
  return value ?? '';
}

/**
 * Validates all required environment variables are present.
 * Call this during app initialization to catch missing vars early.
 */
export function validateEnvConfig(): { valid: boolean; missing: string[] } {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `[config] Missing required environment variables: ${missing.join(', ')}`,
    );
    console.warn(
      '[config] Please create a .env.local file with the required variables.',
    );
  }

  return { valid: missing.length === 0, missing };
}

/* ------------------------------------------------------------------ */
/*  Supabase                                                           */
/* ------------------------------------------------------------------ */

export const supabaseConfig = {
  url: requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  get isConfigured() {
    return Boolean(this.url && this.anonKey);
  },
} as const;

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export const appConfig = {
  /** Base URL used for absolute links (e.g. OG images, emails). */
  baseUrl: env('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000'),
  /** Current environment */
  env: env('NODE_ENV', 'development'),
  get isDev() {
    return this.env === 'development';
  },
  get isProd() {
    return this.env === 'production';
  },
} as const;

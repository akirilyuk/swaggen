/**
 * Next.js Instrumentation – runs once when the server starts.
 *
 * ⚠️  This file is bundled for BOTH Node.js and Edge runtimes.
 *     It must NOT use any Node.js APIs (process.exit, path, dotenv, …)
 *     at the top level or in code reachable by the Edge bundle.
 *     All Node.js-specific logic lives in lib/validateSupabaseConnection.ts
 *     and is loaded via a dynamic import() inside the nodejs guard.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import keeps Node.js APIs out of the Edge bundle
    const { validateSupabaseConnection } = await import(
      './lib/validateSupabaseConnection'
    );
    await validateSupabaseConnection();
  }
}

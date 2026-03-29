'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';
import Sidebar from '@/components/Sidebar';
import { ActionLogProvider, useActionLog } from '@/components/designer/ActionLogContext';
import { ActionLogPanel } from '@/components/designer/ActionLogPanel';

/** Routes that render without the app shell (Sidebar + Header). */
const SHELL_EXCLUDED_ROUTES = new Set(['/login']);

function isPublicSiteRoute(pathname: string): boolean {
  return pathname === '/site' || pathname.startsWith('/site/');
}

/**
 * Wraps children with the Sidebar + Header app shell.
 *
 * - `/login` always renders bare (its own full-screen layout).
 * - Unauthenticated visitors on any other route see the landing page.
 * - Authenticated users see the full app shell (Sidebar + Header).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);
  const [timedOut, setTimedOut] = useState(false);

  // Fallback: if auth hasn't initialized after 5 seconds, stop waiting
  useEffect(() => {
    if (initialized) return;
    const timer = setTimeout(() => {
      console.warn(
        '[AppShell] Auth init timed out after 5s — showing landing page',
      );
      setTimedOut(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [initialized]);

  // Login page always renders bare
  if (SHELL_EXCLUDED_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  // Published project pages — shareable link without signing in
  if (isPublicSiteRoute(pathname)) {
    return <>{children}</>;
  }

  // While auth is loading (with timeout fallback)
  if (!initialized && !timedOut) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  // Not signed in — show the landing / marketing page
  if (!user) {
    return <LandingPage />;
  }

  // Signed in — full app shell + global action log (portal to document.body)
  return (
    <ActionLogProvider>
      <SignedInAppShell>{children}</SignedInAppShell>
    </ActionLogProvider>
  );
}

/** Shell layout + action log panel; logs route changes so the log always reflects activity. */
function SignedInAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { log } = useActionLog();

  useEffect(() => {
    log('info', 'Page view', pathname);
  }, [pathname, log]);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <ActionLogPanel />
    </>
  );
}

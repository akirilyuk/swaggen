'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

/**
 * Initialises Supabase Auth and subscribes to session changes.
 * Mount this once in the root layout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore(s => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <>{children}</>;
}

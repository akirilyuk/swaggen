/**
 * Authentication store — manages Supabase Auth state.
 *
 * Call `initAuth()` once on app mount (e.g. in a root AuthProvider).
 */
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import {
  E2E_MOCK_SESSION,
  E2E_MOCK_USER,
  isE2eMockAuthClient,
} from '@/lib/e2eMockAuth';
import { createBrowserClient } from '@/lib/supabaseBrowser';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  /** Bootstrap auth — subscribe to state changes and load initial session. */
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  initAuth: async () => {
    if (get().initialized) return;

    if (isE2eMockAuthClient()) {
      set({
        user: E2E_MOCK_USER,
        session: E2E_MOCK_SESSION,
        loading: false,
        initialized: true,
      });
      return;
    }

    try {
      const supabase = createBrowserClient();

      // Listen for auth changes (login, logout, token refresh)
      supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, session: Session | null) => {
          const user = session?.user ?? null;
          set({ user, session, loading: false });
        },
      );

      // Load the initial session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;
      set({ user, session, loading: false, initialized: true });
    } catch (err) {
      console.error('[authStore] initAuth failed:', err);
      // Always mark as initialized so the app doesn't get stuck on the spinner
      set({
        user: null,
        session: null,
        loading: false,
        initialized: true,
      });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    console.log('[authStore] Attempting sign in for:', email);

    try {
      const supabase = createBrowserClient();

      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Sign in timed out — please try again.')),
            10000,
          ),
        ),
      ]);

      if (error) {
        set({ loading: false });
        console.error('[authStore] signIn error:', error.message);
        return error.message;
      }

      console.log('[authStore] Sign in successful for:', email);

      const user = data.session?.user ?? null;
      set({
        user,
        session: data.session,
        loading: false,
      });

      return null;
    } catch (err) {
      set({ loading: false });
      const message =
        err instanceof Error ? err.message : 'Sign in failed unexpectedly';
      console.error('[authStore] signIn exception:', message);
      return message;
    }
  },

  signUp: async (email, password) => {
    set({ loading: true });
    console.log('[authStore] Attempting sign up for:', email);

    // Create user via server route (uses service_role for auto-confirmation)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();

    if (!res.ok) {
      set({ loading: false });
      const errMsg = body.error ?? 'Signup failed';
      console.error('[authStore] signUp error:', errMsg);
      return errMsg;
    }

    console.log('[authStore] User created successfully for:', email);

    // User is auto-confirmed — sign in immediately
    const supabase = createBrowserClient();
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      set({ loading: false });
      console.error(
        '[authStore] auto-signIn after signup error:',
        signInError.message,
      );
      return signInError.message;
    }

    console.log('[authStore] Sign up and sign in successful for:', email);

    const user = signInData.session?.user ?? null;
    set({
      user,
      session: signInData.session,
      loading: false,
    });

    return null;
  },

  signOut: async () => {
    console.log('[authStore] Signing out user');
    if (isE2eMockAuthClient()) {
      set({ user: null, session: null, loading: false });
      return;
    }
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    console.log('[authStore] User signed out successfully');
    set({ user: null, session: null, loading: false });
  },
}));

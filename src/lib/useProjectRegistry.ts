/**
 * useProjectRegistry — registers the active project's API paths with the
 * server-side registry on every mount and whenever data changes.
 *
 * Two effects:
 *  1. Runs once on mount (no deps) — unconditionally registers the current
 *     project so a server restart is always recovered on next page load.
 *  2. Runs when project data changes — keeps the registry up to date.
 */
'use client';

import { useEffect, useRef } from 'react';

import { useProjectStore } from '@/store/projectStore';

function register(payload: {
  name: string;
  apiPaths: unknown[];
  middlewares: unknown[];
  services: unknown[];
  pages: unknown[];
  entities: unknown[];
}) {
  fetch('/registry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Best-effort — silently ignore network errors
  });
}

export function useProjectRegistry() {
  const project = useProjectStore(s => s.activeProject());
  const lastSentRef = useRef<string>('');
  const hasMountRegistered = useRef(false);

  useEffect(() => {
    if (!project) return;

    // Build a key that includes all data that affects runtime behavior
    const key = JSON.stringify({
      name: project.name,
      apiPaths: project.apiPaths,
      middlewares: project.middlewares,
      services: project.services,
      pages: project.pages,
      entities: project.entities,
    });

    // Fire once unconditionally the first time we have a project — this
    // recovers from server restarts where the in-memory registry is empty.
    if (!hasMountRegistered.current) {
      hasMountRegistered.current = true;
      register({
        name: project.name,
        apiPaths: project.apiPaths ?? [],
        middlewares: project.middlewares ?? [],
        services: project.services ?? [],
        pages: project.pages ?? [],
        entities: project.entities ?? [],
      });
      lastSentRef.current = key;
      return;
    }

    // Re-register whenever project data changes (including middleware code)
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;

    register({
      name: project.name,
      apiPaths: project.apiPaths ?? [],
      middlewares: project.middlewares ?? [],
      services: project.services ?? [],
      pages: project.pages ?? [],
      entities: project.entities ?? [],
    });
  }, [project]);
}

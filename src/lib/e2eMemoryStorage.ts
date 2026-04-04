/**
 * In-memory Zustand persist backend for Playwright mock-auth runs.
 * Only wired from `projectStore` when `NEXT_PUBLIC_E2E_MOCK_AUTH=1`.
 */
import type { StateStorage } from 'zustand/middleware';

import { buildE2ePersistedStoreJson } from '@/lib/e2eMockProjectSeed';

const memory = new Map<string, string>();

export const e2eMemoryStorage: StateStorage = {
  getItem: async (name: string) => {
    const hit = memory.get(name);
    if (hit !== undefined) return hit;
    if (name === 'swaggen-next-store') {
      const json = buildE2ePersistedStoreJson();
      memory.set(name, json);
      return json;
    }
    return null;
  },
  setItem: async (name, value) => {
    memory.set(name, value);
  },
  removeItem: async name => {
    memory.delete(name);
  },
};

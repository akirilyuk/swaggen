import { PROVIDER_LIST, STORAGE_PROVIDERS } from '@/lib/storageProviders';
import type { DataStorageProvider } from '@/types/project';

describe('storageProviders', () => {
  it('exposes a non-empty provider map with labels', () => {
    const keys = Object.keys(STORAGE_PROVIDERS) as DataStorageProvider[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(STORAGE_PROVIDERS[key].label).toBeTruthy();
    }
  });

  it('PROVIDER_LIST mirrors map entries', () => {
    const keys = Object.keys(STORAGE_PROVIDERS) as DataStorageProvider[];
    expect(PROVIDER_LIST.length).toBe(keys.length);
    const values = new Set(PROVIDER_LIST.map(p => p.value));
    for (const k of keys) {
      expect(values.has(k)).toBe(true);
    }
  });
});

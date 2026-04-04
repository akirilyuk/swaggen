import { validateEnvConfig } from '@/lib/config';

describe('validateEnvConfig', () => {
  const urlKey = 'NEXT_PUBLIC_SUPABASE_URL';
  const anonKey = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

  it('returns valid when both required vars are set', () => {
    const prevUrl = process.env[urlKey];
    const prevAnon = process.env[anonKey];
    process.env[urlKey] = 'https://example.supabase.co';
    process.env[anonKey] = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.' + 'x'.repeat(120);
    const r = validateEnvConfig();
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
    if (prevUrl === undefined) delete process.env[urlKey];
    else process.env[urlKey] = prevUrl;
    if (prevAnon === undefined) delete process.env[anonKey];
    else process.env[anonKey] = prevAnon;
  });

  it('lists missing keys when unset', () => {
    const prevUrl = process.env[urlKey];
    const prevAnon = process.env[anonKey];
    delete process.env[urlKey];
    delete process.env[anonKey];
    const r = validateEnvConfig();
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(expect.arrayContaining([urlKey, anonKey]));
    if (prevUrl !== undefined) process.env[urlKey] = prevUrl;
    if (prevAnon !== undefined) process.env[anonKey] = prevAnon;
  });
});

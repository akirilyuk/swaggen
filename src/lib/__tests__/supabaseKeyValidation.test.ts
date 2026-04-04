import {
  isAcceptablePublicSupabaseKey,
  isValidSupabaseJwtShape,
  publicSupabaseKeyRejectionReason,
} from '@/lib/supabaseKeyValidation';

/** Minimal JWT-shaped string: header.payload.signature (long enough for shape check). */
function fakeJwt(payloadObj: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = 's'.repeat(120);
  return `${header}.${payload}.${sig}`;
}

describe('supabaseKeyValidation', () => {
  it('isValidSupabaseJwtShape accepts long eyJ tokens', () => {
    const k = fakeJwt({ role: 'anon' });
    expect(k.startsWith('eyJ')).toBe(true);
    expect(isValidSupabaseJwtShape(k)).toBe(true);
  });

  it('rejects short or wrong-prefix keys', () => {
    expect(isValidSupabaseJwtShape('eyJshort')).toBe(false);
    expect(isValidSupabaseJwtShape('notjwt' + 'x'.repeat(120))).toBe(false);
  });

  it('isAcceptablePublicSupabaseKey rejects service_role', () => {
    const bad = fakeJwt({ role: 'service_role' });
    expect(isAcceptablePublicSupabaseKey(bad)).toBe(false);
    expect(publicSupabaseKeyRejectionReason(bad)).toMatch(/service_role/i);
  });

  it('isAcceptablePublicSupabaseKey accepts anon-shaped role', () => {
    const good = fakeJwt({ role: 'anon' });
    expect(isAcceptablePublicSupabaseKey(good)).toBe(true);
    expect(publicSupabaseKeyRejectionReason(good)).toBeNull();
  });

  it('publicSupabaseKeyRejectionReason handles empty key', () => {
    expect(publicSupabaseKeyRejectionReason('')).toMatch(/not set/i);
  });
});

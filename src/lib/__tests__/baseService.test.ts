import { ServiceError } from '@/lib/baseService';

describe('ServiceError', () => {
  it('exposes code, status, and optional details', () => {
    const err = new ServiceError('failed', {
      code: 'RATE_LIMIT',
      status: 429,
      details: { retryAfter: 5 },
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('failed');
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.status).toBe(429);
    expect(err.details).toMatchObject({ retryAfter: 5 });
  });

  it('uses defaults for optional fields', () => {
    const err = new ServiceError('x');
    expect(err.code).toBe('SERVICE_ERROR');
    expect(err.status).toBe(500);
  });
});

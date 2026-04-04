import { mergeBotProviderIntoConfig } from '@/lib/botProviderSettings';

describe('mergeBotProviderIntoConfig', () => {
  it('sets api key when draft non-empty', () => {
    const next = mergeBotProviderIntoConfig(
      {},
      {
        apiKeyDraft: ' sk-test ',
        removeApiKey: false,
        isNewBot: true,
        baseUrlDraft: '',
        organizationIdDraft: '',
      },
    );
    expect(next.apiKey).toBe('sk-test');
  });

  it('preserves existing api key when draft empty and bot is not new', () => {
    const next = mergeBotProviderIntoConfig(
      { apiKey: 'secret', foo: 1 },
      {
        apiKeyDraft: '',
        removeApiKey: false,
        isNewBot: false,
        baseUrlDraft: '',
        organizationIdDraft: '',
      },
    );
    expect(next.apiKey).toBe('secret');
    expect(next.foo).toBe(1);
  });

  it('removes api key when removeApiKey is true', () => {
    const next = mergeBotProviderIntoConfig(
      { apiKey: 'x' },
      {
        apiKeyDraft: '',
        removeApiKey: true,
        isNewBot: false,
        baseUrlDraft: '',
        organizationIdDraft: '',
      },
    );
    expect(next.apiKey).toBeUndefined();
  });

  it('non-empty draft wins over removeApiKey', () => {
    const next = mergeBotProviderIntoConfig(
      { apiKey: 'old' },
      {
        apiKeyDraft: 'new-key',
        removeApiKey: true,
        isNewBot: false,
        baseUrlDraft: '',
        organizationIdDraft: '',
      },
    );
    expect(next.apiKey).toBe('new-key');
  });

  it('writes baseUrl and organizationId', () => {
    const next = mergeBotProviderIntoConfig(
      {},
      {
        apiKeyDraft: '',
        removeApiKey: false,
        isNewBot: true,
        baseUrlDraft: 'http://localhost:11434',
        organizationIdDraft: 'org_123',
      },
    );
    expect(next.baseUrl).toBe('http://localhost:11434');
    expect(next.organizationId).toBe('org_123');
  });
});

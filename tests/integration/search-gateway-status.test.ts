import { afterEach, describe, expect, it } from 'vitest';
import {
  getProviderStatus,
  validateSearchConfig
} from '@openfons/search-gateway';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('search-gateway provider status', () => {
  it('returns resolved provider status and config validation for a project', () => {
    process.env.GOOGLE_APIKEY = 'google-key';
    process.env.GOOGLE_CX = 'google-cx';
    process.env.BING_APIKEY = 'bing-key';
    process.env.BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';
    process.env.BAIDU_APIKEY = 'baidu-key';
    process.env.BAIDU_SECRETKEY = 'baidu-secret';
    process.env.BRAVE_APIKEY = 'brave-key';
    process.env.TAVILY_APIKEY = 'tavily-key';

    const statuses = getProviderStatus('openfons');
    const validation = validateSearchConfig('openfons');

    expect(statuses.some((item) => item.providerId === 'google')).toBe(true);
    expect(
      statuses.find((item) => item.providerId === 'google')?.credentialResolvedFrom
    ).toBe('system');
    expect(validation.valid).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  loadCredentialSchemas,
  loadProviderCatalog,
  resolveEffectiveSearchPolicy
} from '@openfons/search-gateway';

describe('search-gateway policy resolution', () => {
  it('loads provider catalog and merges global defaults with project override', () => {
    const catalog = loadProviderCatalog();
    const credentialSchemas = loadCredentialSchemas();
    const policy = resolveEffectiveSearchPolicy({
      projectId: 'openfons',
      purpose: 'planning'
    });

    expect(catalog.map((item) => item.providerId)).toEqual([
      'google',
      'brave',
      'bing',
      'tavily',
      'baidu',
      'ddg'
    ]);
    expect(credentialSchemas.find((item) => item.providerId === 'brave')).toBeDefined();
    expect(policy.providers).toEqual(['ddg', 'google', 'brave', 'bing']);
    expect(policy.allowDomains).toContain('openai.com');
    expect(policy.denyDomains).toContain('pinterest.com');
    expect(policy.denyDomains).toContain('medium.com');
  });
});

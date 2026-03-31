import { describe, expect, it } from 'vitest';
import {
  CollectorDispatchRequestSchema,
  CredentialSchemaSchema,
  ProviderDiagnosticSchema,
  ProviderCapabilitySchema,
  ProviderStatusSchema,
  SearchRequestSchema,
  SearchResultSchema,
  SearchRunResultSchema,
  SearchRunSchema,
  UpgradeCandidateSchema,
  UpgradeDispatchResultSchema,
  ValidationResultSchema
} from '@openfons/contracts';

function createSearchRunResultInput() {
  return {
    searchRun: {
      id: 'search_run_001',
      projectId: 'openfons',
      purpose: 'planning' as const,
      query: 'direct api vs openrouter',
      status: 'completed' as const,
      selectedProviders: ['google', 'brave'],
      degradedProviders: ['bing'],
      startedAt: '2026-03-31T01:00:00.000Z',
      finishedAt: '2026-03-31T01:00:02.000Z'
    },
    results: [
      {
        id: 'search_result_001',
        searchRunId: 'search_run_001',
        provider: 'google' as const,
        title: 'Provider pricing docs',
        url: 'https://example.com/docs',
        snippet: 'Official pricing and availability',
        rank: 1,
        page: 1,
        domain: 'example.com',
        sourceKindGuess: 'official' as const,
        dedupKey: 'example.com/docs',
        selectedForUpgrade: true,
        selectionReason: 'official-domain'
      }
    ],
    upgradeCandidates: [
      {
        searchResultId: 'search_result_001',
        searchRunId: 'search_run_001',
        recommendedAction: 'http' as const,
        reason: 'official pricing page',
        priority: 100,
        requiresHumanReview: false,
        proposedSourceKind: 'official',
        proposedUseAs: 'primary'
      }
    ],
    diagnostics: [
      {
        providerId: 'google' as const,
        status: 'success' as const,
        degraded: false,
        reason: 'ok',
        durationMs: 120,
        resultCount: 10,
        rateLimitState: 'healthy'
      }
    ],
    downgradeInfo: [
      {
        providerId: 'bing',
        status: 'degraded',
        reason: 'missing-credential',
        fallbackProviderId: 'brave',
        phase: 'orchestration',
        occurredAt: '2026-03-31T01:00:01.500Z'
      }
    ]
  };
}

describe('search gateway contracts', () => {
  it('parses frozen SearchRequest fields including geo/language/providers', () => {
    const parsed = SearchRequestSchema.parse({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'direct api vs openrouter',
      geo: 'global',
      language: 'English',
      providers: ['google', 'brave'],
      maxResults: 20,
      pages: 2,
      autoUpgrade: false
    });

    expect(parsed.projectId).toBe('openfons');
    expect(parsed.providers).toEqual(['google', 'brave']);
  });

  it('parses a planning search run result', () => {
    const parsed = SearchRunResultSchema.parse(createSearchRunResultInput());
    expect(parsed.searchRun.purpose).toBe('planning');
    expect(parsed.results[0].provider).toBe('google');
    expect(parsed.upgradeCandidates[0].recommendedAction).toBe('http');
    expect(parsed.downgradeInfo[0].phase).toBe('orchestration');
  });

  it('parses provider capability, credential schema, validation result, and dispatch result', () => {
    const capability = ProviderCapabilitySchema.parse({
      providerId: 'google',
      displayName: 'Google Programmable Search',
      category: 'external-api',
      enabledByDefault: true,
      requiresCredential: true,
      supportsGeo: true,
      supportsLanguage: true,
      supportsPagination: true,
      supportsMultiQuery: true,
      supportsAsync: true,
      supportsSnippet: true,
      supportsRichMetadata: false,
      supportsRateLimitHeader: false,
      defaultPriority: 10,
      defaultTimeoutMs: 5000,
      degradePriority: 100,
      riskLevel: 'low',
      notes: 'primary provider'
    });
    const credentialSchema = CredentialSchemaSchema.parse({
      providerId: 'google',
      requiredFields: ['apiKey'],
      optionalFields: ['cx'],
      validationRules: ['apiKey required'],
      sensitiveFields: ['apiKey'],
      projectOverrideAllowed: true
    });
    const providerStatus = ProviderStatusSchema.parse({
      providerId: 'google',
      enabled: true,
      healthy: true,
      credentialResolvedFrom: 'project',
      degraded: false
    });
    const validation = ValidationResultSchema.parse({
      valid: true,
      errors: [],
      warnings: [],
      resolvedProviders: [providerStatus]
    });
    const dispatch = UpgradeDispatchResultSchema.parse({
      searchRunId: 'search_run_001',
      dispatchedCount: 1,
      skippedCount: 0,
      collectorRequests: [
        {
          searchResultId: 'search_result_001',
          action: 'browser',
          url: 'https://example.com/docs'
        }
      ],
      warnings: []
    });

    expect(capability.supportsAsync).toBe(true);
    expect(capability.displayName).toBe('Google Programmable Search');
    expect(capability.category).toBe('external-api');
    expect(capability.supportsRateLimitHeader).toBe(false);
    expect(capability.defaultTimeoutMs).toBe(5000);
    expect(credentialSchema.requiredFields).toContain('apiKey');
    expect(validation.valid).toBe(true);
    expect(dispatch.dispatchedCount).toBe(1);
    expect(dispatch.collectorRequests[0].action).toBe('browser');
  });

  it('allows all supported sourceKindGuess values', () => {
    const sourceKinds = [
      'official',
      'community',
      'commercial',
      'inference',
      'unknown'
    ] as const;

    sourceKinds.forEach((sourceKindGuess, index) => {
      const parsed = SearchResultSchema.parse({
        id: `search_result_${index}`,
        searchRunId: 'search_run_001',
        provider: 'bing',
        title: `title_${index}`,
        url: `https://example.com/${index}`,
        snippet: `snippet_${index}`,
        rank: index + 1,
        page: 1,
        domain: 'example.com',
        sourceKindGuess,
        dedupKey: `example.com/${index}`,
        selectedForUpgrade: false,
        selectionReason: 'none'
      });
      expect(parsed.sourceKindGuess).toBe(sourceKindGuess);
    });
  });

  it('accepts SearchRun with required top-level fields and optional workflowId/taskId omitted', () => {
    const parsed = SearchRunSchema.parse({
      id: 'run_002',
      projectId: 'openfons',
      purpose: 'evidence',
      query: 'open source browser automation tools',
      status: 'queued',
      selectedProviders: ['ddg'],
      degradedProviders: [],
      startedAt: '2026-03-31T02:00:00.000Z'
    });

    expect(parsed.workflowId).toBeUndefined();
    expect(parsed.taskId).toBeUndefined();
  });

  it('requires SearchRunResult to include all top-level payload groups and downgradeInfo as array', () => {
    const missingDiagnostics = {
      ...createSearchRunResultInput()
    };
    delete (missingDiagnostics as Partial<typeof missingDiagnostics>).diagnostics;

    const result = SearchRunResultSchema.safeParse(missingDiagnostics);
    expect(result.success).toBe(false);

    const badDowngradeInfo = {
      ...createSearchRunResultInput(),
      downgradeInfo: {
        providerId: 'bing',
        status: 'degraded',
        reason: 'missing-credential',
        fallbackProviderId: 'brave',
        phase: 'orchestration',
        occurredAt: '2026-03-31T01:00:01.500Z'
      }
    };
    const downgradeResult = SearchRunResultSchema.safeParse(badDowngradeInfo);
    expect(downgradeResult.success).toBe(false);
  });

  it('parses provider diagnostic, upgrade candidate, and collector dispatch request', () => {
    const diagnostic = ProviderDiagnosticSchema.parse({
      providerId: 'google',
      status: 'success',
      degraded: false,
      reason: 'ok',
      durationMs: 200,
      resultCount: 8,
      rateLimitState: 'healthy'
    });
    const candidate = UpgradeCandidateSchema.parse({
      searchResultId: 'search_result_001',
      searchRunId: 'search_run_001',
      recommendedAction: 'api',
      reason: 'structured endpoint available',
      priority: 60,
      requiresHumanReview: false,
      proposedSourceKind: 'official',
      proposedUseAs: 'primary'
    });
    const parsed = CollectorDispatchRequestSchema.parse({
      searchResultId: 'search_result_001',
      action: 'browser',
      url: 'https://example.com/zh'
    });

    expect(diagnostic.status).toBe('success');
    expect(candidate.recommendedAction).toBe('api');
    expect(parsed.action).toBe('browser');
  });
});

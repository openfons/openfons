import { describe, expect, it } from 'vitest';
import {
  EvidenceAcquisitionMetaSchema,
  RetrievalOutcomeSchema,
  RetrievalPlanSchema,
  RouteReadinessSchema,
  SearchRunResultSchema,
  SourceReadinessSchema
} from '@openfons/contracts';

describe('@openfons/contracts retrieval orchestration schemas', () => {
  it('parses readiness, retrieval, and acquisition metadata together', () => {
    const route = RouteReadinessSchema.parse({
      sourceId: 'search',
      routeKey: 'google',
      status: 'ready',
      qualityTier: 'primary',
      requirements: [{ code: 'api-key', message: 'google api key is configured' }],
      blockers: [],
      warnings: [],
      detail: { pluginId: 'google-default' }
    });

    const source = SourceReadinessSchema.parse({
      sourceId: 'search',
      status: 'ready',
      routes: [route],
      summary: 'google is available for search retrieval',
      updatedAt: '2026-04-13T18:40:00.000Z'
    });

    const plan = RetrievalPlanSchema.parse({
      sourceId: 'search',
      planVersion: 'v1',
      generatedAt: '2026-04-13T18:40:00.000Z',
      candidates: [
        {
          routeKey: 'google',
          qualityTier: 'primary',
          status: 'ready',
          priority: 100
        }
      ],
      omissions: []
    });

    const outcome = RetrievalOutcomeSchema.parse({
      sourceId: 'search',
      planVersion: 'v1',
      attempts: [
        {
          sourceId: 'search',
          routeKey: 'google',
          attemptIndex: 0,
          startedAt: '2026-04-13T18:40:00.000Z',
          finishedAt: '2026-04-13T18:40:01.000Z',
          decisionBasis: 'ready-primary',
          result: 'succeeded'
        }
      ],
      selectedRoute: 'google',
      status: 'succeeded',
      omissions: []
    });

    const acquisitionMeta = EvidenceAcquisitionMetaSchema.parse({
      sourceId: 'search',
      routeKey: 'google',
      qualityTier: 'primary',
      routeStatusAtAttempt: 'ready',
      retrievalStatus: 'succeeded',
      attemptedAt: '2026-04-13T18:40:01.000Z',
      decisionReason: 'ready-primary',
      warnings: [],
      blockers: []
    });

    const run = SearchRunResultSchema.parse({
      searchRun: {
        id: 'search_run_001',
        projectId: 'openfons',
        purpose: 'planning',
        query: 'openai pricing official',
        status: 'completed',
        selectedProviders: ['google'],
        degradedProviders: [],
        startedAt: '2026-04-13T18:40:00.000Z',
        finishedAt: '2026-04-13T18:40:01.000Z'
      },
      results: [],
      upgradeCandidates: [],
      diagnostics: [],
      downgradeInfo: [],
      retrievalPlan: plan,
      retrievalOutcome: outcome
    });

    expect(source.routes[0]?.routeKey).toBe('google');
    expect(acquisitionMeta.routeKey).toBe('google');
    expect(run.retrievalOutcome?.selectedRoute).toBe('google');
  });
});

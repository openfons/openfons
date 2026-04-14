import { describe, expect, it } from 'vitest';
import type { SearchRunResult, SourceCapture } from '@openfons/contracts';
import {
  createCollectionLog,
  createSourceCapture
} from '@openfons/domain-models';
import { buildCompilation, buildOpportunity } from '../../services/control-api/src/compiler.js';
import {
  AI_PROCUREMENT_CAPTURE_TARGETS
} from '../../services/control-api/src/cases/ai-procurement.js';
import {
  createAiProcurementRealCollectionBridge
} from '../../services/control-api/src/collection/real-collection-bridge.js';

const createOpportunityInput = () => ({
  title: 'Direct API vs OpenRouter for AI Coding Teams',
  query: 'direct api vs openrouter',
  market: 'global',
  audience: 'small ai teams',
  problem: 'Teams need cheaper but reliable model procurement',
  outcome: 'Produce a source-backed report',
  geo: 'global',
  language: 'English'
});

const createCaptureRunnerResult = (plans: {
  topicRunId: string;
  title: string;
  url: string;
  sourceKind: SourceCapture['sourceKind'];
  useAs: SourceCapture['useAs'];
  reportability: SourceCapture['reportability'];
  riskLevel: SourceCapture['riskLevel'];
  captureType: SourceCapture['captureType'];
  language: string;
  region: string;
}[]) => {
  const sourceCaptures = plans.map((plan) =>
    createSourceCapture({
      topicRunId: plan.topicRunId,
      title: plan.title,
      url: plan.url,
      sourceKind: plan.sourceKind,
      useAs: plan.useAs,
      reportability: plan.reportability,
      riskLevel: plan.riskLevel,
      captureType: plan.captureType,
      language: plan.language,
      region: plan.region,
      summary: `${plan.title} captured from live bridge`
    })
  );

  return {
    sourceCaptures,
    collectionLogs: sourceCaptures.map((capture) =>
      createCollectionLog({
        topicRunId: capture.topicRunId,
        captureId: capture.id,
        step: 'capture',
        status: 'success',
        message: `Captured ${capture.title} via real collection bridge`
      })
    )
  };
};

const createSearchRunResult = (
  target: (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
): SearchRunResult => ({
  searchRun: {
    id: 'search_run_001',
    projectId: 'openfons',
    opportunityId: 'opp_001',
    workflowId: 'wf_001',
    taskId: 'task_001',
    purpose: 'evidence',
    query: target.query,
    status: 'completed',
    selectedProviders: ['google'],
    degradedProviders: [],
    startedAt: '2026-04-13T19:00:00.000Z',
    finishedAt: '2026-04-13T19:00:01.000Z'
  },
  results: [
    {
      id: 'search_result_001',
      searchRunId: 'search_run_001',
      provider: 'google',
      title: target.title,
      url: target.url,
      snippet: `${target.title} snippet`,
      rank: 1,
      page: 1,
      domain: new URL(target.url).hostname,
      sourceKindGuess: target.sourceKind,
      dedupKey: `${target.key}-dedup`,
      selectedForUpgrade: false,
      selectionReason: 'matched-target'
    }
  ],
  upgradeCandidates: [],
  diagnostics: [],
  downgradeInfo: [],
  retrievalPlan: {
    sourceId: 'search',
    planVersion: 'v1',
    generatedAt: '2026-04-13T19:00:00.000Z',
    candidates: [
      {
        routeKey: 'google',
        qualityTier: 'primary',
        status: 'ready',
        priority: 100
      }
    ],
    omissions: []
  },
  retrievalOutcome: {
    sourceId: 'search',
    planVersion: 'v1',
    attempts: [
      {
        sourceId: 'search',
        routeKey: 'google',
        attemptIndex: 0,
        startedAt: '2026-04-13T19:00:00.000Z',
        finishedAt: '2026-04-13T19:00:01.000Z',
        decisionBasis: 'ready-primary',
        result: 'succeeded'
      }
    ],
    selectedRoute: 'google',
    status: 'succeeded',
    omissions: []
  }
});

const createFallbackSearchRunResult = (
  target: (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
): SearchRunResult => ({
  searchRun: {
    id: 'search_run_002',
    projectId: 'openfons',
    opportunityId: 'opp_001',
    workflowId: 'wf_001',
    taskId: 'task_001',
    purpose: 'evidence',
    query: target.query,
    status: 'completed',
    selectedProviders: ['google', 'ddg'],
    degradedProviders: ['google'],
    startedAt: '2026-04-13T19:10:00.000Z',
    finishedAt: '2026-04-13T19:10:01.000Z'
  },
  results: [
    {
      id: 'search_result_002',
      searchRunId: 'search_run_002',
      provider: 'ddg',
      title: target.title,
      url: target.url,
      snippet: `${target.title} snippet`,
      rank: 1,
      page: 1,
      domain: new URL(target.url).hostname,
      sourceKindGuess: target.sourceKind,
      dedupKey: `${target.key}-ddg-dedup`,
      selectedForUpgrade: false,
      selectionReason: 'matched-target'
    }
  ],
  upgradeCandidates: [],
  diagnostics: [],
  downgradeInfo: [
    {
      providerId: 'google',
      status: 'degraded',
      reason: 'google api key missing',
      fallbackProviderId: 'ddg',
      phase: 'orchestration',
      occurredAt: '2026-04-13T19:10:00.000Z'
    }
  ],
  retrievalPlan: {
    sourceId: 'search',
    planVersion: 'v1',
    generatedAt: '2026-04-13T19:10:00.000Z',
    candidates: [
      {
        routeKey: 'ddg',
        qualityTier: 'fallback',
        status: 'degraded',
        priority: 60,
        penaltyReason: 'ddg fallback route used after primary was unavailable'
      }
    ],
    omissions: [
      {
        routeKey: 'google',
        status: 'blocked',
        reason: 'google api key missing'
      }
    ]
  },
  retrievalOutcome: {
    sourceId: 'search',
    planVersion: 'v1',
    attempts: [
      {
        sourceId: 'search',
        routeKey: 'ddg',
        attemptIndex: 0,
        startedAt: '2026-04-13T19:10:00.000Z',
        finishedAt: '2026-04-13T19:10:01.000Z',
        decisionBasis: 'degraded-fallback',
        result: 'succeeded'
      }
    ],
    selectedRoute: 'ddg',
    status: 'partial',
    omissions: [
      {
        routeKey: 'google',
        status: 'blocked',
        reason: 'google api key missing'
      }
    ]
  }
});

describe('real collection bridge acquisition metadata', () => {
  it('threads retrieval outcome metadata into compiled evidence items', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const bridge = createAiProcurementRealCollectionBridge({
      searchClient: {
        search: async (request) => {
          const target = AI_PROCUREMENT_CAPTURE_TARGETS.find(
            (item) => item.query === request.query
          );

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(target);
        }
      },
      captureRunner: async (plans) => createCaptureRunnerResult(plans)
    });

    const compiled = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });

    expect(
      compiled.evidenceSet.items.find((item) => item.acquisitionMeta)?.acquisitionMeta
    ).toMatchObject({
      sourceId: 'search',
      routeKey: 'google',
      retrievalStatus: 'succeeded'
    });
  });

  it('preserves fallback penalties and blocked omissions in acquisition metadata', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const bridge = createAiProcurementRealCollectionBridge({
      searchClient: {
        search: async (request) => {
          const target = AI_PROCUREMENT_CAPTURE_TARGETS.find(
            (item) => item.query === request.query
          );

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createFallbackSearchRunResult(target);
        }
      },
      captureRunner: async (plans) => createCaptureRunnerResult(plans)
    });

    const compiled = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });
    const acquisitionMeta = compiled.evidenceSet.items.find(
      (item) => item.acquisitionMeta?.routeKey === 'ddg'
    )?.acquisitionMeta;

    expect(acquisitionMeta).toMatchObject({
      sourceId: 'search',
      routeKey: 'ddg',
      qualityTier: 'fallback',
      routeStatusAtAttempt: 'degraded',
      retrievalStatus: 'succeeded'
    });
    expect(acquisitionMeta?.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'penalty_reason'
        })
      ])
    );
    expect(acquisitionMeta?.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'omission:google',
          message: 'google api key missing'
        })
      ])
    );
  });
});

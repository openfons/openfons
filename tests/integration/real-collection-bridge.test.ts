import { describe, expect, it } from 'vitest';
import type {
  CollectionLog,
  SearchRunResult,
  SourceCapture
} from '@openfons/contracts';
import {
  createCollectionLog,
  createSourceCapture
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';
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

const createSearchRunResult = (
  target: (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
): SearchRunResult => {
  const searchRunId = createId('srch');

  return {
    searchRun: {
      id: searchRunId,
      projectId: 'openfons',
      opportunityId: createId('opp'),
      workflowId: createId('wf'),
      taskId: createId('task'),
      purpose: 'evidence',
      query: target.query,
      status: 'completed',
      selectedProviders: ['bing', 'google'],
      degradedProviders: ['google'],
      startedAt: nowIso(),
      finishedAt: nowIso()
    },
    results: [
      {
        id: createId('result'),
        searchRunId,
        provider: 'bing',
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
    diagnostics: [
      {
        providerId: 'bing',
        status: 'success',
        degraded: false,
        reason: 'healthy',
        durationMs: 120,
        resultCount: 1
      },
      {
        providerId: 'google',
        status: 'degraded',
        degraded: true,
        reason: 'rate-limited',
        durationMs: 900,
        resultCount: 0
      }
    ],
    downgradeInfo: [
      {
        providerId: 'google',
        status: 'degraded',
        reason: 'rate-limited',
        fallbackProviderId: 'bing',
        phase: 'search',
        occurredAt: nowIso()
      }
    ]
  };
};

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

  const collectionLogs = sourceCaptures.map((capture) =>
    createCollectionLog({
      topicRunId: capture.topicRunId,
      captureId: capture.id,
      step: 'capture',
      status: 'success',
      message: `Captured ${capture.title} via real collection bridge`
    })
  );

  return { sourceCaptures, collectionLogs };
};

describe('real collection bridge follow-up behavior', () => {
  it('preserves search provider selection and downgrade traces in collection logs', async () => {
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
      compiled.collectionLogs.some((log) =>
        log.message.includes('selected providers: bing, google')
      )
    ).toBe(true);
    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes('degraded providers: google')
      )
    ).toBe(true);
    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes('downgrade google -> bing: rate-limited')
      )
    ).toBe(true);
  });

  it('preserves runtime bridge logs when falling back to deterministic data', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const topicRunId = createId('topic');
    const runtimeLogs: CollectionLog[] = [
      createCollectionLog({
        topicRunId,
        step: 'discover',
        status: 'warning',
        message: 'Search openai-pricing degraded providers: google'
      }),
      createCollectionLog({
        topicRunId,
        step: 'capture',
        status: 'error',
        message: 'Capture openai-pricing failed with 429'
      })
    ];

    await expect(
      buildCompilation(opportunity, {
        buildAiProcurementCaseBundle: async () => {
          throw Object.assign(new Error('search providers unavailable'), {
            name: 'AiProcurementRuntimeError',
            logs: runtimeLogs
          });
        }
      })
    ).resolves.toMatchObject({
      collectionLogs: expect.arrayContaining([
        expect.objectContaining({
          message: 'Search openai-pricing degraded providers: google'
        }),
        expect.objectContaining({
          message: 'Capture openai-pricing failed with 429'
        }),
        expect.objectContaining({
          message: expect.stringContaining('deterministic fallback')
        })
      ])
    });
  });

  it('captures canonical target urls instead of volatile matched result urls', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const capturePlans: Array<{ title: string; url: string }> = [];
    const bridge = createAiProcurementRealCollectionBridge({
      searchClient: {
        search: async (request) => {
          const target = AI_PROCUREMENT_CAPTURE_TARGETS.find(
            (item) => item.query === request.query
          );

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return {
            ...createSearchRunResult(target),
            results: [
              {
                ...createSearchRunResult(target).results[0],
                url:
                  target.key === 'openrouter-community'
                    ? 'https://github.com/BerriAI/litellm/issues/11626?tracking=1'
                    : target.key === 'openai-availability'
                      ? 'https://help.openai.com/fr-ca/articles/5347006-openai-api-supported-countries-and-territories'
                      : target.url
              }
            ]
          };
        }
      },
      captureRunner: async (plans) => {
        capturePlans.push(...plans.map((plan) => ({ title: plan.title, url: plan.url })));
        return createCaptureRunnerResult(plans);
      }
    });

    await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });

    expect(capturePlans).toContainEqual({
      title: 'OpenAI API supported countries and territories',
      url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories'
    });
    expect(capturePlans).toContainEqual({
      title: 'OpenRouter streaming does not return cost and is_byok',
      url: 'https://github.com/BerriAI/litellm/issues/11626'
    });
  });

  it('does not silently fall back for unexpected bridge invariant errors', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());

    await expect(
      buildCompilation(opportunity, {
        buildAiProcurementCaseBundle: async () => {
          throw new Error('bridge invariant mismatch');
        }
      })
    ).rejects.toThrow('bridge invariant mismatch');
  });
});

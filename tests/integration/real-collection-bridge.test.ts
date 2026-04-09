import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CollectionLog,
  SearchRunResult,
  SourceCapture
} from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createTopicRun,
  createSourceCapture
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';
import { buildCompilation, buildOpportunity } from '../../services/control-api/src/compiler.js';
import {
  AI_PROCUREMENT_CAPTURE_TARGETS,
  resolveAiProcurementProfileForOpportunity
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

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../../services/control-api/src/cases/ai-procurement.js');
  vi.doUnmock(
    '../../services/control-api/src/collection/crawler-execution/runtime.js'
  );
  vi.doUnmock(
    '../../services/control-api/src/collection/crawler-execution/dispatcher.js'
  );
  vi.doUnmock(
    '../../services/control-api/src/collection/crawler-execution/yt-dlp-runner.js'
  );
  vi.doUnmock(
    '../../services/control-api/src/collection/crawler-execution/tiktok-api-runner.js'
  );
});

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

  it('queries the profile-derived target set instead of a single global list', async () => {
    const opportunity = buildOpportunity({
      title: 'OpenAI Availability and Rate Limit Access for APAC Teams',
      query: 'openai availability and rate limit access for apac teams',
      market: 'apac',
      audience: 'platform teams',
      problem: 'Need to know whether a public API path is available in-region',
      outcome: 'Choose a compliant procurement path',
      geo: 'APAC',
      language: 'English'
    });
    const profileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
    const seenQueries: string[] = [];
    const bridge = createAiProcurementRealCollectionBridge({
      searchClient: {
        search: async (request) => {
          seenQueries.push(request.query);
          const target = profileTargets.find((item) => item.query === request.query);

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(target);
        }
      },
      captureRunner: async (plans) => createCaptureRunnerResult(plans)
    });

    await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });

    expect(seenQueries.some((query) => query.includes('supported countries'))).toBe(
      true
    );
  });

  it('maps evidence onto live captures by canonical url instead of deterministic template order', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const profileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;

    vi.doMock('../../services/control-api/src/cases/ai-procurement.js', async () => {
      const actual = await vi.importActual<
        typeof import('../../services/control-api/src/cases/ai-procurement.js')
      >('../../services/control-api/src/cases/ai-procurement.js');

      return {
        ...actual,
        buildAiProcurementCase: (inputOpportunity, workflow) => {
          const original = actual.buildAiProcurementCase(inputOpportunity, workflow);
          const reorderedSourceCaptures = [...original.sourceCaptures].reverse();
          const originalCaptureById = new Map(
            original.sourceCaptures.map((capture) => [capture.id, capture])
          );
          const reorderedCaptureByUrl = new Map(
            reorderedSourceCaptures.map((capture) => [capture.url, capture])
          );

          return {
            ...original,
            sourceCaptures: reorderedSourceCaptures,
            evidenceSet: {
              ...original.evidenceSet,
              items: original.evidenceSet.items.map((item) => {
                const primaryCapture = originalCaptureById.get(item.captureId);

                if (!primaryCapture) {
                  throw new Error(`missing template capture ${item.captureId}`);
                }

                const reorderedPrimaryCapture = reorderedCaptureByUrl.get(
                  primaryCapture.url
                );

                if (!reorderedPrimaryCapture) {
                  throw new Error(
                    `missing reordered template capture ${primaryCapture.url}`
                  );
                }

                return {
                  ...item,
                  captureId: reorderedPrimaryCapture.id,
                  supportingCaptureIds: item.supportingCaptureIds.map((captureId) => {
                    const supportingCapture = originalCaptureById.get(captureId);

                    if (!supportingCapture) {
                      throw new Error(`missing template capture ${captureId}`);
                    }

                    const reorderedSupportingCapture = reorderedCaptureByUrl.get(
                      supportingCapture.url
                    );

                    if (!reorderedSupportingCapture) {
                      throw new Error(
                        `missing reordered template capture ${supportingCapture.url}`
                      );
                    }

                    return reorderedSupportingCapture.id;
                  })
                };
              })
            }
          };
        }
      };
    });

    const { createAiProcurementRealCollectionBridge: createBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );
    const bridge = createBridge({
      searchClient: {
        search: async (request) => {
          const target = profileTargets.find((item) => item.query === request.query);

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(
            target as (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
          );
        }
      },
      captureRunner: async (plans) => createCaptureRunnerResult(plans)
    });

    const result = await bridge(opportunity, {
      id: createId('wf'),
      opportunityId: opportunity.id,
      taskIds: [createId('task')],
      status: 'ready'
    });
    const captureUrlById = new Map(
      result.sourceCaptures.map((capture) => [capture.id, capture.url])
    );
    const communityEvidence = result.evidenceSet.items.find(
      (item) => item.kind === 'community'
    );
    const pricingEvidence = result.evidenceSet.items.find(
      (item) => item.kind === 'pricing'
    );

    expect(captureUrlById.get(communityEvidence?.captureId ?? '')).toBe(
      'https://github.com/BerriAI/litellm/issues/11626'
    );
    expect(
      pricingEvidence?.supportingCaptureIds.map((captureId) =>
        captureUrlById.get(captureId)
      )
    ).toEqual([
      'https://openai.com/api/pricing/',
      'https://ai.google.dev/gemini-api/docs/billing'
    ]);
  });

  it('fails loudly when a deterministic template url cannot be matched to a live capture', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const profileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
    const missingTemplateUrl = 'https://example.com/unmapped-template-url';

    vi.doMock('../../services/control-api/src/cases/ai-procurement.js', async () => {
      const actual = await vi.importActual<
        typeof import('../../services/control-api/src/cases/ai-procurement.js')
      >('../../services/control-api/src/cases/ai-procurement.js');

      return {
        ...actual,
        buildAiProcurementCase: (inputOpportunity, workflow) => {
          const original = actual.buildAiProcurementCase(inputOpportunity, workflow);

          return {
            ...original,
            sourceCaptures: original.sourceCaptures.map((capture, index) =>
              index === 0 ? { ...capture, url: missingTemplateUrl } : capture
            )
          };
        }
      };
    });

    const { createAiProcurementRealCollectionBridge: createBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );
    const bridge = createBridge({
      searchClient: {
        search: async (request) => {
          const target = profileTargets.find((item) => item.query === request.query);

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(
            target as (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
          );
        }
      },
      captureRunner: async (plans) => createCaptureRunnerResult(plans)
    });

    await expect(
      bridge(opportunity, {
        id: createId('wf'),
        opportunityId: opportunity.id,
        taskIds: [createId('task')],
        status: 'ready'
      })
    ).rejects.toThrow(
      `missing live capture for template url ${missingTemplateUrl}`
    );
  });

  it('fails loudly when live captures contain duplicate canonical urls', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const profileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
    const duplicatedUrl = profileTargets[0]?.url;
    const bridge = createAiProcurementRealCollectionBridge({
      searchClient: {
        search: async (request) => {
          const target = profileTargets.find((item) => item.query === request.query);

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(
            target as (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
          );
        }
      },
      captureRunner: async (plans) => {
        const result = createCaptureRunnerResult(plans);

        return {
          ...result,
          sourceCaptures: result.sourceCaptures.map((capture, index) =>
            index === 1 && duplicatedUrl ? { ...capture, url: duplicatedUrl } : capture
          )
        };
      }
    });

    await expect(
      bridge(opportunity, {
        id: createId('wf'),
        opportunityId: opportunity.id,
        taskIds: [createId('task')],
        status: 'ready'
      })
    ).rejects.toThrow(`duplicate live capture url ${duplicatedUrl}`);
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

  it('routes youtube runtime targets to crawler execution and keeps them out of captureRunner', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const workflow = {
      id: createId('wf'),
      opportunityId: opportunity.id,
      taskIds: [createId('task')],
      status: 'ready' as const
    };
    const profileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
    const youtubeRuntimeTarget = profileTargets[0];
    const routeRuntime = {
      routeKey: 'youtube',
      mode: 'public-first' as const,
      collection: {
        pluginId: 'youtube-yt-dlp',
        type: 'crawler-adapter' as const,
        driver: 'yt-dlp' as const,
        config: {},
        secrets: {}
      },
      browser: undefined,
      accounts: [],
      cookies: [],
      proxy: undefined
    };
    const resolveExecutableCrawlerRouteForUrl = vi.fn(({ url }: { url: string }) =>
      url === youtubeRuntimeTarget.url ? routeRuntime : undefined
    );
    const run = vi.fn(async (plan: {
      capturePlan: {
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
      };
    }) => {
      const sourceCapture = createSourceCapture({
        topicRunId: plan.capturePlan.topicRunId,
        title: plan.capturePlan.title,
        url: plan.capturePlan.url,
        sourceKind: plan.capturePlan.sourceKind,
        useAs: plan.capturePlan.useAs,
        reportability: plan.capturePlan.reportability,
        riskLevel: plan.capturePlan.riskLevel,
        captureType: plan.capturePlan.captureType,
        language: plan.capturePlan.language,
        region: plan.capturePlan.region,
        summary: `${plan.capturePlan.title} captured via yt-dlp runtime`
      });

      return {
        sourceCapture,
        collectionLogs: [
          createCollectionLog({
            topicRunId: plan.capturePlan.topicRunId,
            captureId: sourceCapture.id,
            step: 'capture',
            status: 'success',
            message: `Captured ${plan.capturePlan.title} via yt-dlp runtime`
          })
        ]
      };
    });

    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/runtime.js',
      () => ({
        resolveExecutableCrawlerRouteForUrl
      })
    );
    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/dispatcher.js',
      () => ({
        createCrawlerExecutionDispatcher: () => ({
          run
        })
      })
    );

    const { createAiProcurementRealCollectionBridge: createBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );

    const captureRunner = vi.fn(async (plans) => createCaptureRunnerResult(plans));
    const bridge = createBridge({
      searchClient: {
        search: async (request) => {
          const target = profileTargets.find((item) => item.query === request.query);

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(
            target as (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
          );
        }
      },
      captureRunner
    });

    const result = await bridge(opportunity, workflow);

    expect(resolveExecutableCrawlerRouteForUrl).toHaveBeenCalled();
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[0]).toMatchObject({
      runtime: {
        routeKey: 'youtube',
        collection: {
          driver: 'yt-dlp'
        }
      },
      capturePlan: {
        url: youtubeRuntimeTarget.url
      }
    });
    expect(captureRunner).toHaveBeenCalledOnce();
    const publicPlans = captureRunner.mock.calls[0]?.[0] ?? [];
    expect(publicPlans).toHaveLength(profileTargets.length - 1);
    expect(publicPlans.some((plan: { url: string }) => plan.url === youtubeRuntimeTarget.url)).toBe(
      false
    );

    const routeTargetIndex = profileTargets.findIndex(
      (target) => target.url === youtubeRuntimeTarget.url
    );
    expect(result.sourceCaptures[routeTargetIndex]?.summary).toContain(
      'captured via yt-dlp runtime'
    );
  });

  it('routes tiktok runtime targets to crawler execution and keeps them out of captureRunner', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const defaultProfileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
    const target = {
      key: 'tiktok-proof',
      title: 'TikTok proof target',
      query: 'site:tiktok.com/@openfons',
      url: 'https://www.tiktok.com/@openfons',
      urlPattern: /^https:\/\/www\.tiktok\.com\/@openfons\/?(?:\?[^#]*)?$/i,
      sourceKind: 'official' as const,
      useAs: 'primary' as const,
      reportability: 'reportable' as const,
      riskLevel: 'low' as const,
      captureType: 'doc-page' as const,
      language: 'en',
      region: 'global',
      summary: 'TikTok route target'
    };
    const profileTargets = [target, ...defaultProfileTargets.slice(1)];

    vi.doMock('../../services/control-api/src/cases/ai-procurement.js', async () => {
      const actual = await vi.importActual<
        typeof import('../../services/control-api/src/cases/ai-procurement.js')
      >('../../services/control-api/src/cases/ai-procurement.js');

      return {
        ...actual,
        resolveAiProcurementProfileForOpportunity: () => ({
          family: 'vendor-choice',
          captureTargets: profileTargets,
          evidenceTemplates: [],
          report: {
            summary: 'Test profile',
            thesis: 'Test thesis',
            sections: [],
            evidenceBoundaries: [],
            risks: [],
            claims: []
          }
        }),
        buildAiProcurementCase: (inputOpportunity, workflow) => {
          const topicRun = createTopicRun(
            inputOpportunity.id,
            workflow.id,
            'ai-procurement'
          );
          const sourceCaptures = profileTargets.map((captureTarget) =>
            createSourceCapture({
              topicRunId: topicRun.id,
              title: captureTarget.title,
              url: captureTarget.url,
              sourceKind: captureTarget.sourceKind,
              useAs: captureTarget.useAs,
              reportability: captureTarget.reportability,
              riskLevel: captureTarget.riskLevel,
              captureType: captureTarget.captureType,
              language: captureTarget.language,
              region: captureTarget.region,
              summary: captureTarget.summary
            })
          );
          const evidenceSet = createEvidenceSet(topicRun.id);

          return {
            topicRun: {
              ...topicRun,
              status: 'compiled' as const,
              updatedAt: nowIso()
            },
            sourceCaptures,
            collectionLogs: sourceCaptures.map((capture) =>
              createCollectionLog({
                topicRunId: topicRun.id,
                captureId: capture.id,
                step: 'capture',
                status: 'success',
                message: `Captured ${capture.title}`
              })
            ),
            evidenceSet: {
              ...evidenceSet,
              updatedAt: nowIso(),
              items: []
            }
          };
        }
      };
    });

    const resolveExecutableCrawlerRouteForUrl = vi.fn(({ url }: { url: string }) =>
      url === target.url
        ? {
            routeKey: 'tiktok',
            mode: 'requires-auth' as const,
            collection: {
              pluginId: 'tiktok-adapter',
              type: 'crawler-adapter' as const,
              driver: 'tiktok-api' as const,
              config: {},
              secrets: {}
            },
            browser: undefined,
            accounts: [
              {
                pluginId: 'tiktok-account-main',
                type: 'account-source' as const,
                driver: 'credentials-file',
                config: {},
                secrets: {
                  accountRef: {
                    valueSource: 'secret' as const,
                    configured: true as const,
                    value: { username: 'collector-bot' }
                  }
                }
              }
            ],
            cookies: [
              {
                pluginId: 'tiktok-cookie-main',
                type: 'cookie-source' as const,
                driver: 'netscape-cookie-file',
                config: {},
                secrets: {
                  sessionRef: {
                    valueSource: 'secret' as const,
                    configured: true as const,
                    value: 'ms_token=abc123'
                  }
                }
              }
            ],
            proxy: {
              pluginId: 'global-proxy-pool',
              type: 'proxy-source' as const,
              driver: 'static-proxy-file',
              config: {},
              secrets: {
                poolRef: {
                  valueSource: 'secret' as const,
                  configured: true as const,
                  value: [{ endpoint: 'http://proxy.local:9000' }]
                }
              }
            }
          }
        : undefined
    );
    const run = vi.fn(async (plan: {
      capturePlan: {
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
      };
    }) => {
      const sourceCapture = createSourceCapture({
        topicRunId: plan.capturePlan.topicRunId,
        title: plan.capturePlan.title,
        url: plan.capturePlan.url,
        sourceKind: plan.capturePlan.sourceKind,
        useAs: plan.capturePlan.useAs,
        reportability: plan.capturePlan.reportability,
        riskLevel: plan.capturePlan.riskLevel,
        captureType: plan.capturePlan.captureType,
        language: plan.capturePlan.language,
        region: plan.capturePlan.region,
        summary: `${plan.capturePlan.title} captured via tiktok runtime`
      });

      return {
        sourceCapture,
        collectionLogs: [
          createCollectionLog({
            topicRunId: plan.capturePlan.topicRunId,
            captureId: sourceCapture.id,
            step: 'capture',
            status: 'success',
            message: `Captured ${plan.capturePlan.title} via tiktok runtime`
          })
        ]
      };
    });

    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/runtime.js',
      () => ({
        resolveExecutableCrawlerRouteForUrl
      })
    );
    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/dispatcher.js',
      () => ({
        createCrawlerExecutionDispatcher: () => ({
          run
        })
      })
    );

    const { createAiProcurementRealCollectionBridge: createBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );

    const bridge = createBridge({
      searchClient: {
        search: async (request) => {
          const matchedTarget = profileTargets.find(
            (item) => item.query === request.query
          );

          if (!matchedTarget) {
            throw new Error(`missing target for ${request.query}`);
          }

          return matchedTarget.key === target.key
            ? {
                searchRun: {
                  id: createId('srch'),
                  projectId: 'openfons',
                  opportunityId: opportunity.id,
                  workflowId: createId('wf'),
                  taskId: createId('task'),
                  purpose: 'evidence',
                  query: target.query,
                  status: 'completed',
                  selectedProviders: ['google'],
                  degradedProviders: [],
                  startedAt: nowIso(),
                  finishedAt: nowIso()
                },
                results: [
                  {
                    id: createId('result'),
                    searchRunId: createId('srch'),
                    provider: 'google',
                    title: target.title,
                    url: target.url,
                    snippet: 'matched',
                    rank: 1,
                    page: 1,
                    domain: 'www.tiktok.com',
                    sourceKindGuess: 'official',
                    dedupKey: 'tiktok-proof',
                    selectedForUpgrade: false,
                    selectionReason: 'matched-target'
                  }
                ],
                upgradeCandidates: [],
                diagnostics: [],
                downgradeInfo: []
              }
            : createSearchRunResult(
                matchedTarget as (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
              );
        }
      },
      captureRunner: vi.fn(async (plans) => createCaptureRunnerResult(plans))
    });

    const result = await bridge(opportunity, {
      id: createId('wf'),
      opportunityId: opportunity.id,
      taskIds: [createId('task')],
      status: 'ready'
    });

    expect(resolveExecutableCrawlerRouteForUrl).toHaveBeenCalledTimes(
      profileTargets.length
    );
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[0]).toMatchObject({
      runtime: {
        routeKey: 'tiktok',
        collection: {
          driver: 'tiktok-api'
        }
      },
      capturePlan: {
        url: target.url
      }
    });
    const routeTargetIndex = profileTargets.findIndex(
      (item) => item.url === target.url
    );
    expect(result.sourceCaptures[routeTargetIndex]?.summary).toContain(
      'captured via tiktok runtime'
    );
  });

  it('falls back through AiProcurementRuntimeError when route-backed crawler execution fails', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const profileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
    const routeTarget = profileTargets[0];

    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/runtime.js',
      () => ({
        resolveExecutableCrawlerRouteForUrl: ({ url }: { url: string }) =>
          url === routeTarget.url
            ? {
                routeKey: 'youtube',
                mode: 'public-first',
                collection: {
                  pluginId: 'youtube-yt-dlp',
                  type: 'crawler-adapter',
                  driver: 'yt-dlp',
                  config: {},
                  secrets: {}
                },
                browser: undefined,
                accounts: [],
                cookies: [],
                proxy: undefined
              }
            : undefined
      })
    );
    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/dispatcher.js',
      () => ({
        createCrawlerExecutionDispatcher: () => ({
          run: async () => {
            throw new Error('yt-dlp exited with code 1');
          }
        })
      })
    );

    const { createAiProcurementRealCollectionBridge: createBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );
    const bridge = createBridge({
      searchClient: {
        search: async (request) => {
          const target = profileTargets.find((item) => item.query === request.query);

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(
            target as (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
          );
        }
      },
      captureRunner: async (plans) => createCaptureRunnerResult(plans)
    });

    const compiled = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });

    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes('yt-dlp exited with code 1')
      )
    ).toBe(true);
    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes('deterministic fallback')
      )
    ).toBe(true);
  });

  it('falls back through AiProcurementRuntimeError when public capture fails', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());

    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/runtime.js',
      () => ({
        resolveExecutableCrawlerRouteForUrl: () => undefined
      })
    );

    const { createAiProcurementRealCollectionBridge: createBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );
    const bridge = createBridge({
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
      captureRunner: async () => {
        throw new Error('curl 429');
      }
    });

    const compiled = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });

    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes('Public capture failed: curl 429')
      )
    ).toBe(true);
    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes('deterministic fallback')
      )
    ).toBe(true);
  });

  it('fails explicitly for unsupported resolved crawler drivers instead of silently using captureRunner', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const profileTargets =
      resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
    const routeTarget = profileTargets[0];

    vi.doMock(
      '../../services/control-api/src/collection/crawler-execution/runtime.js',
      () => ({
        resolveExecutableCrawlerRouteForUrl: ({ url }: { url: string }) =>
          url === routeTarget.url
            ? {
                routeKey: 'youtube',
                mode: 'public-first',
                collection: {
                  pluginId: 'youtube-media-crawler',
                  type: 'crawler-adapter',
                  driver: 'media-crawler',
                  config: {},
                  secrets: {}
                },
                browser: undefined,
                accounts: [],
                cookies: [],
                proxy: undefined
              }
            : undefined
      })
    );

    const { createAiProcurementRealCollectionBridge: createBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );
    const bridge = createBridge({
      searchClient: {
        search: async (request) => {
          const target = profileTargets.find((item) => item.query === request.query);

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return createSearchRunResult(
            target as (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number]
          );
        }
      },
      captureRunner: async (plans) => createCaptureRunnerResult(plans)
    });

    const compiled = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });

    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes(
          'crawler execution is not implemented for media-crawler'
        )
      )
    ).toBe(true);
    expect(
      compiled.collectionLogs.some((log) =>
        log.message.includes('deterministic fallback')
      )
    ).toBe(true);
  });
});

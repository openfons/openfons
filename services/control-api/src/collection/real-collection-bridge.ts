import type {
  CollectionLog,
  EvidenceAcquisitionMeta,
  SearchRequest,
  SearchRunResult,
  SearchResult,
  SourceCapture
} from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createTopicRun
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';
import {
  buildAiProcurementCase,
  resolveAiProcurementProfileForOpportunity,
  type AiProcurementCaseBundle
} from '../cases/ai-procurement.js';
import type { AiProcurementCaptureTarget } from '../cases/ai-procurement-profiles.js';
import {
  createCaptureRunner,
  type CapturePlan,
  type CaptureRunner
} from './capture-runner.js';
import {
  createRuntimeSearchClient,
  type SearchClient
} from './search-client.js';
import { resolveExecutableCrawlerRouteForUrl } from './crawler-execution/runtime.js';
import { createCrawlerExecutionDispatcher } from './crawler-execution/dispatcher.js';
import { createYtDlpRunner } from './crawler-execution/yt-dlp-runner.js';
import { createTikTokApiRunner } from './crawler-execution/tiktok-api-runner.js';

type SelectedTarget = AiProcurementCaptureTarget & {
  result: SearchResult;
};

export class AiProcurementRuntimeError extends Error {
  readonly logs: CollectionLog[];

  constructor(message: string, logs: CollectionLog[], cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AiProcurementRuntimeError';
    this.logs = logs;
  }
}

export const isAiProcurementRuntimeError = (
  error: unknown
): error is { message: string; logs?: CollectionLog[]; name: string } =>
  error instanceof AiProcurementRuntimeError ||
  (error instanceof Error && error.name === 'AiProcurementRuntimeError');

const buildSearchRequest = (input: {
  projectId: string;
  opportunityId: string;
  workflowId: string;
  taskId?: string;
  query: string;
  geo: string;
  language: string;
}): SearchRequest => ({
  projectId: input.projectId,
  opportunityId: input.opportunityId,
  workflowId: input.workflowId,
  taskId: input.taskId,
  purpose: 'evidence',
  query: input.query,
  geo: input.geo,
  language: input.language,
  maxResults: 10,
  pages: 1,
  autoUpgrade: false
});

const selectSearchResult = (
  target: AiProcurementCaptureTarget,
  results: SearchResult[]
) => results.find((result) => target.urlPattern.test(result.url));

const createRuntimeError = (
  message: string,
  logs: CollectionLog[],
  cause?: unknown
) => new AiProcurementRuntimeError(message, logs, cause);

const buildSearchAcquisitionMeta = (
  searchRun: SearchRunResult,
  selected: SearchResult
): EvidenceAcquisitionMeta => {
  const selectedRouteKey =
    searchRun.retrievalOutcome?.selectedRoute ?? selected.provider;
  const selectedAttempt = searchRun.retrievalOutcome?.attempts.find(
    (attempt) =>
      attempt.result === 'succeeded' && attempt.routeKey === selectedRouteKey
  );
  const selectedCandidate = searchRun.retrievalPlan?.candidates.find(
    (candidate) => candidate.routeKey === selectedRouteKey
  );
  const warnings = selectedCandidate?.penaltyReason
    ? [
        {
          code: 'penalty_reason',
          message: selectedCandidate.penaltyReason
        }
      ]
    : [];
  const blockers = (searchRun.retrievalOutcome?.omissions ??
    searchRun.retrievalPlan?.omissions ??
    []
  ).map((omission) => ({
    code: `omission:${omission.routeKey}`,
    message: omission.reason
  }));

  if (selectedCandidate) {
    return {
      sourceId: 'search',
      routeKey: selectedRouteKey,
      qualityTier: selectedCandidate.qualityTier,
      routeStatusAtAttempt: selectedCandidate.status,
      retrievalStatus: selectedAttempt?.result ?? 'succeeded',
      attemptedAt: selectedAttempt?.finishedAt ?? searchRun.searchRun.finishedAt ?? nowIso(),
      decisionReason: selectedAttempt?.decisionBasis ?? 'search-result-selected',
      warnings,
      blockers
    };
  }

  return {
    sourceId: 'search',
    routeKey: selectedRouteKey,
    qualityTier: 'primary',
    routeStatusAtAttempt: 'ready',
    retrievalStatus: selectedAttempt?.result ?? 'succeeded',
    attemptedAt: selectedAttempt?.finishedAt ?? searchRun.searchRun.finishedAt ?? nowIso(),
    decisionReason: selectedAttempt?.decisionBasis ?? 'search-result-selected',
    warnings,
    blockers
  };
};

const mapTemplateCaptureIdsToLiveIds = (
  deterministicCaptures: SourceCapture[],
  liveCaptures: SourceCapture[]
) => {
  const liveCaptureByUrl = new Map<string, SourceCapture>();

  for (const capture of liveCaptures) {
    if (liveCaptureByUrl.has(capture.url)) {
      throw new Error(`duplicate live capture url ${capture.url}`);
    }

    liveCaptureByUrl.set(capture.url, capture);
  }

  return new Map(
    deterministicCaptures.map((capture) => {
      const liveCapture = liveCaptureByUrl.get(capture.url);

      if (!liveCapture) {
        throw new Error(`missing live capture for template url ${capture.url}`);
      }

      return [capture.id, liveCapture.id];
    })
  );
};

const resolveMappedCaptureId = (
  captureIdMap: Map<string, string>,
  captureId: string
) => {
  const mappedCaptureId = captureIdMap.get(captureId);

  if (!mappedCaptureId) {
    throw new Error(`missing mapped capture id for template capture ${captureId}`);
  }

  return mappedCaptureId;
};

const toCapturePlan = (
  topicRunId: string,
  target: SelectedTarget
): CapturePlan => ({
  topicRunId,
  title: target.title,
  // Search proves the target was discovered; capture uses the canonical URL
  // so query params, locale variants, or anti-bot wrappers don't degrade the run.
  url: target.url,
  snippet: target.result.snippet,
  sourceKind: target.sourceKind,
  useAs: target.useAs,
  reportability: target.reportability,
  riskLevel: target.riskLevel,
  captureType: target.captureType,
  language: target.language,
  region: target.region
});

const createSearchTraceLogs = ({
  topicRunId,
  targetKey,
  selectedUrl,
  searchRun
}: {
  topicRunId: string;
  targetKey: string;
  selectedUrl: string;
  searchRun: SearchRunResult;
}) => {
  const logs: CollectionLog[] = [
    createCollectionLog({
      topicRunId,
      step: 'discover',
      status: 'success',
      message: `Search ${targetKey} selected ${selectedUrl} (selected providers: ${searchRun.searchRun.selectedProviders.join(', ')})`
    })
  ];

  if (searchRun.searchRun.degradedProviders.length > 0) {
    logs.push(
      createCollectionLog({
        topicRunId,
        step: 'discover',
        status: 'warning',
        message: `Search ${targetKey} degraded providers: ${searchRun.searchRun.degradedProviders.join(', ')}`
      })
    );
  }

  logs.push(
    ...searchRun.downgradeInfo.map((item) =>
      createCollectionLog({
        topicRunId,
        step: 'discover',
        status: 'warning',
        message: `Search ${targetKey} downgrade ${item.providerId} -> ${item.fallbackProviderId ?? 'none'}: ${item.reason}`
      })
    )
  );

  return logs;
};

export type BuildAiProcurementCaseBundle = (
  opportunity: Parameters<typeof buildAiProcurementCase>[0],
  workflow: Parameters<typeof buildAiProcurementCase>[1]
) => Promise<AiProcurementCaseBundle>;

export const createAiProcurementRealCollectionBridge = ({
  projectId = 'openfons',
  repoRoot = process.cwd(),
  secretRoot,
  searchClient = createRuntimeSearchClient({ projectId, repoRoot, secretRoot }),
  captureRunner = createCaptureRunner()
}: {
  projectId?: string;
  repoRoot?: string;
  secretRoot?: string;
  searchClient?: SearchClient;
  captureRunner?: CaptureRunner;
} = {}): BuildAiProcurementCaseBundle => {
  let crawlerExecutionDispatcher:
    | ReturnType<typeof createCrawlerExecutionDispatcher>
    | undefined;
  const getCrawlerExecutionDispatcher = () => {
    crawlerExecutionDispatcher ??= createCrawlerExecutionDispatcher({
      ytDlpRunner: createYtDlpRunner(),
      tiktokApiRunner: createTikTokApiRunner({ repoRoot })
    });

    return crawlerExecutionDispatcher;
  };

  return async (opportunity, workflow) => {
    const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');
    const profile = resolveAiProcurementProfileForOpportunity(opportunity);
    const selectedTargets: SelectedTarget[] = [];
    const acquisitionMetaByUrl = new Map<string, EvidenceAcquisitionMeta>();
    const discoveryLogs: CollectionLog[] = [];

    for (const [index, target] of profile.captureTargets.entries()) {
      const taskId = workflow.taskIds[index % workflow.taskIds.length];
      let searchRun: SearchRunResult;

      try {
        searchRun = await searchClient.search(
          buildSearchRequest({
            projectId,
            opportunityId: opportunity.id,
            workflowId: workflow.id,
            taskId,
            query: target.query,
            geo: opportunity.geo,
            language: opportunity.language
          })
        );
      } catch (error) {
        throw createRuntimeError(
          `search failed for ${target.key}: ${error instanceof Error ? error.message : 'unknown error'}`,
          [
            ...discoveryLogs,
            createCollectionLog({
              topicRunId: topicRun.id,
              step: 'discover',
              status: 'error',
              message: `Search ${target.key} failed: ${error instanceof Error ? error.message : 'unknown error'}`
            })
          ],
          error
        );
      }

      const selected = selectSearchResult(target, searchRun.results);

      if (!selected) {
        throw createRuntimeError(
          `no search result matched ${target.key}`,
          [
            ...discoveryLogs,
            ...createSearchTraceLogs({
              topicRunId: topicRun.id,
              targetKey: target.key,
              selectedUrl: 'no-match',
              searchRun
            }),
            createCollectionLog({
              topicRunId: topicRun.id,
              step: 'discover',
              status: 'error',
              message: `Search ${target.key} failed to find a matching capture target`
            })
          ]
        );
      }

      selectedTargets.push({
        ...target,
        result: selected
      });
      acquisitionMetaByUrl.set(target.url, buildSearchAcquisitionMeta(searchRun, selected));
      discoveryLogs.push(
        ...createSearchTraceLogs({
          topicRunId: topicRun.id,
          targetKey: target.key,
          selectedUrl: selected.url,
          searchRun
        })
      );
    }

    const publicPlanIndices: number[] = [];
    const publicCapturePlans: CapturePlan[] = [];
    const captureBySelectedIndex = new Map<number, SourceCapture>();
    const captureLogs: CollectionLog[] = [];

    for (const [index, target] of selectedTargets.entries()) {
      const capturePlan = toCapturePlan(topicRun.id, target);
      let runtime = undefined;

      try {
        runtime = resolveExecutableCrawlerRouteForUrl({
          projectId,
          repoRoot,
          secretRoot,
          url: target.url
        });
      } catch (error) {
        const details = error instanceof Error ? error.message : 'unknown error';

        throw createRuntimeError(
          `crawler runtime resolution failed for ${target.key}: ${details}`,
          [
            ...discoveryLogs,
            ...captureLogs,
            createCollectionLog({
              topicRunId: topicRun.id,
              step: 'capture',
              status: 'error',
              message: `Crawler runtime resolution failed for ${target.key}: ${details}`
            })
          ],
          error
        );
      }

      if (!runtime) {
        publicPlanIndices.push(index);
        publicCapturePlans.push(capturePlan);
        continue;
      }

      discoveryLogs.push(
        createCollectionLog({
          topicRunId: topicRun.id,
          step: 'capture',
          status: 'success',
          message: `Resolved crawler runtime ${runtime.collection.driver} for ${target.key} via route ${runtime.routeKey}`
        })
      );

      try {
        const routeExecution = await getCrawlerExecutionDispatcher().run({
          capturePlan,
          runtime
        });
        captureBySelectedIndex.set(index, routeExecution.sourceCapture);
        captureLogs.push(...routeExecution.collectionLogs);
      } catch (error) {
        const details = error instanceof Error ? error.message : 'unknown error';

        throw createRuntimeError(
          `crawler execution failed for ${target.key}: ${details}`,
          [
            ...discoveryLogs,
            ...captureLogs,
            createCollectionLog({
              topicRunId: topicRun.id,
              step: 'capture',
              status: 'error',
              message: `Crawler execution failed for ${target.key}: ${details}`
            })
          ],
          error
        );
      }
    }

    if (publicCapturePlans.length > 0) {
      try {
        const publicCaptureResult = await captureRunner(publicCapturePlans);

        if (publicCaptureResult.sourceCaptures.length !== publicCapturePlans.length) {
          throw new Error(
            `public capture count mismatch: expected ${publicCapturePlans.length}, got ${publicCaptureResult.sourceCaptures.length}`
          );
        }

        publicPlanIndices.forEach((selectedIndex, publicIndex) => {
          const sourceCapture = publicCaptureResult.sourceCaptures[publicIndex];

          if (!sourceCapture) {
            throw new Error(
              `missing public capture result at index ${publicIndex}`
            );
          }

          captureBySelectedIndex.set(selectedIndex, sourceCapture);
        });
        captureLogs.push(...publicCaptureResult.collectionLogs);
      } catch (error) {
        const details = error instanceof Error ? error.message : 'unknown error';

        throw createRuntimeError(
          `public capture failed: ${details}`,
          [
            ...discoveryLogs,
            ...captureLogs,
            createCollectionLog({
              topicRunId: topicRun.id,
              step: 'capture',
              status: 'error',
              message: `Public capture failed: ${details}`
            })
          ],
          error
        );
      }
    }

    const sourceCaptures = selectedTargets.map((target, index) => {
      const sourceCapture = captureBySelectedIndex.get(index);

      if (!sourceCapture) {
        throw new Error(`missing capture result for selected target ${target.key}`);
      }

      return sourceCapture;
    });

    const deterministicTemplate = buildAiProcurementCase(opportunity, workflow);
    const deterministicCaptures = deterministicTemplate.sourceCaptures;

    if (sourceCaptures.length !== deterministicCaptures.length) {
      throw new Error('real bridge capture count did not match the template');
    }

    const captureIdMap = mapTemplateCaptureIdsToLiveIds(
      deterministicCaptures,
      sourceCaptures
    );
    const deterministicCaptureUrlById = new Map(
      deterministicCaptures.map((capture) => [capture.id, capture.url])
    );
    const evidenceSet = createEvidenceSet(topicRun.id);

    return {
      topicRun: {
        ...topicRun,
        status: 'compiled',
        updatedAt: nowIso()
      },
      sourceCaptures,
      collectionLogs: [...discoveryLogs, ...captureLogs],
      evidenceSet: {
        ...evidenceSet,
        updatedAt: nowIso(),
        items: deterministicTemplate.evidenceSet.items.map((item) => ({
          ...item,
          id: createId('evi'),
          topicRunId: topicRun.id,
          captureId: resolveMappedCaptureId(captureIdMap, item.captureId),
          freshnessNote: 'Verified against live captures during this run.',
          acquisitionMeta: acquisitionMetaByUrl.get(
            deterministicCaptureUrlById.get(item.captureId) ?? ''
          ),
          supportingCaptureIds: item.supportingCaptureIds.map((captureId) =>
            resolveMappedCaptureId(captureIdMap, captureId)
          )
        }))
      }
    };
  };
};

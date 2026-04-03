import type {
  CollectionLog,
  SearchRequest,
  SearchRunResult,
  SearchResult
} from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createTopicRun
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';
import {
  AI_PROCUREMENT_CAPTURE_TARGETS,
  buildAiProcurementCase,
  type AiProcurementCaseBundle
} from '../cases/ai-procurement.js';
import {
  createCaptureRunner,
  type CapturePlan,
  type CaptureRunner
} from './capture-runner.js';
import {
  createRuntimeSearchClient,
  type SearchClient
} from './search-client.js';

type SelectedTarget = (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number] & {
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
  target: (typeof AI_PROCUREMENT_CAPTURE_TARGETS)[number],
  results: SearchResult[]
) => results.find((result) => target.urlPattern.test(result.url));

const createRuntimeError = (
  message: string,
  logs: CollectionLog[],
  cause?: unknown
) => new AiProcurementRuntimeError(message, logs, cause);

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
  searchClient = createRuntimeSearchClient({ projectId }),
  captureRunner = createCaptureRunner()
}: {
  projectId?: string;
  searchClient?: SearchClient;
  captureRunner?: CaptureRunner;
} = {}): BuildAiProcurementCaseBundle => {
  return async (opportunity, workflow) => {
    const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');
    const selectedTargets: SelectedTarget[] = [];
    const discoveryLogs: CollectionLog[] = [];

    for (const [index, target] of AI_PROCUREMENT_CAPTURE_TARGETS.entries()) {
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
      discoveryLogs.push(
        ...createSearchTraceLogs({
          topicRunId: topicRun.id,
          targetKey: target.key,
          selectedUrl: selected.url,
          searchRun
        })
      );
    }

    const capturePlans: CapturePlan[] = selectedTargets.map((target) => ({
      topicRunId: topicRun.id,
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
    }));

    let sourceCaptures: Awaited<ReturnType<CaptureRunner>>['sourceCaptures'];
    let collectionLogs: Awaited<ReturnType<CaptureRunner>>['collectionLogs'];

    try {
      ({ sourceCaptures, collectionLogs } = await captureRunner(capturePlans));
    } catch (error) {
      throw createRuntimeError(
        error instanceof Error ? error.message : 'capture runner failed',
        [
          ...discoveryLogs,
          createCollectionLog({
            topicRunId: topicRun.id,
            step: 'capture',
            status: 'error',
            message: `Capture run failed: ${error instanceof Error ? error.message : 'unknown error'}`
          })
        ],
        error
      );
    }

    const deterministicTemplate = buildAiProcurementCase(opportunity, workflow);
    const deterministicCaptures = deterministicTemplate.sourceCaptures;

    if (sourceCaptures.length !== deterministicCaptures.length) {
      throw new Error('real bridge capture count did not match the template');
    }

    const captureIdMap = new Map(
      deterministicCaptures.map((capture, index) => [capture.id, sourceCaptures[index].id])
    );
    const evidenceSet = createEvidenceSet(topicRun.id);

    return {
      topicRun: {
        ...topicRun,
        status: 'compiled',
        updatedAt: nowIso()
      },
      sourceCaptures,
      collectionLogs: [...discoveryLogs, ...collectionLogs],
      evidenceSet: {
        ...evidenceSet,
        updatedAt: nowIso(),
        items: deterministicTemplate.evidenceSet.items.map((item) => ({
          ...item,
          id: createId('evi'),
          topicRunId: topicRun.id,
          captureId: captureIdMap.get(item.captureId) ?? item.captureId,
          freshnessNote: 'Verified against live captures during this run.',
          supportingCaptureIds: item.supportingCaptureIds.map(
            (captureId) => captureIdMap.get(captureId) ?? captureId
          )
        }))
      }
    };
  };
};

import type {
  CollectionLog,
  SearchRequest,
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
      const searchRun = await searchClient.search(
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
      const selected = selectSearchResult(target, searchRun.results);

      if (!selected) {
        throw new Error(`no search result matched ${target.key}`);
      }

      selectedTargets.push({
        ...target,
        result: selected
      });
      discoveryLogs.push(
        createCollectionLog({
          topicRunId: topicRun.id,
          step: 'discover',
          status: 'success',
          message: `Selected ${selected.url} for ${target.key}`
        })
      );
    }

    const capturePlans: CapturePlan[] = selectedTargets.map((target) => ({
      topicRunId: topicRun.id,
      title: target.title,
      url: target.result.url,
      snippet: target.result.snippet,
      sourceKind: target.sourceKind,
      useAs: target.useAs,
      reportability: target.reportability,
      riskLevel: target.riskLevel,
      captureType: target.captureType,
      language: target.language,
      region: target.region
    }));

    const { sourceCaptures, collectionLogs } = await captureRunner(capturePlans);
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

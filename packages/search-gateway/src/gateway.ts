import { createId, nowIso } from '@openfons/shared';
import type {
  DowngradeInfo,
  ProviderDiagnostic,
  SearchProviderId,
  SearchRequest,
  SearchResult,
  SearchRunResult,
  UpgradeCandidate,
  UpgradeDispatchResult
} from '@openfons/contracts';
import { buildDedupKey, dedupeResults } from './dedupe.js';
import {
  buildDiagnostic,
  guessSourceKind,
  normalizeDomain,
  type SearchProviderAdapter
} from './providers/base.js';
import { resolveEffectiveSearchPolicy, type SearchPolicy } from './policy.js';

export type SearchRunStore = {
  saveRun: (run: SearchRunResult) => void;
  getRun: (id: string) => SearchRunResult | undefined;
};

const createDefaultRunStore = (): SearchRunStore => {
  const runs = new Map<string, SearchRunResult>();

  return {
    saveRun(run) {
      runs.set(run.searchRun.id, run);
    },
    getRun(id) {
      return runs.get(id);
    }
  };
};

export const createSearchGateway = ({
  projectId,
  providers,
  dispatchCollectorRequests,
  resolvePolicy = resolveEffectiveSearchPolicy,
  runStore = createDefaultRunStore()
}: {
  projectId: string;
  providers: Partial<Record<SearchProviderId, SearchProviderAdapter>>;
  dispatchCollectorRequests?: (candidates: UpgradeCandidate[]) => Promise<void>;
  resolvePolicy?: (input: {
    projectId: string;
    purpose: SearchRequest['purpose'];
  }) => SearchPolicy;
  runStore?: SearchRunStore;
}) => ({
  async search(request: SearchRequest): Promise<SearchRunResult> {
    const effectiveProjectId = request.projectId || projectId;
    const effectivePolicy = resolvePolicy({
      projectId: effectiveProjectId,
      purpose: request.purpose
    });
    const selectedProviderIds = request.providers ?? effectivePolicy.providers;
    const searchRunId = createId('search_run');
    const startedAt = nowIso();
    const diagnostics: ProviderDiagnostic[] = [];
    const downgradeInfo: DowngradeInfo[] = [];
    const rawResults: SearchResult[] = [];

    for (const providerId of selectedProviderIds) {
      const adapter = providers[providerId];
      const started = Date.now();

      if (!adapter) {
        diagnostics.push(
          buildDiagnostic({
            providerId,
            status: 'failed',
            degraded: true,
            reason: 'missing-provider-adapter',
            durationMs: Date.now() - started,
            resultCount: 0
          })
        );
        downgradeInfo.push({
          providerId,
          status: 'degraded',
          reason: 'missing-provider-adapter',
          phase: 'orchestration',
          occurredAt: nowIso()
        });
        continue;
      }

      try {
        for (let page = 1; page <= request.pages; page += 1) {
          const pageResults = await adapter.search({
            query: request.query,
            geo: request.geo,
            language: request.language,
            page,
            maxResults: request.maxResults
          });

          rawResults.push(
            ...pageResults.map((item) => {
              const domain = normalizeDomain(item.url);
              return {
                id: createId('search_result'),
                searchRunId,
                provider: adapter.id,
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                rank: item.rank,
                page: item.page,
                domain,
                sourceKindGuess: guessSourceKind(domain),
                dedupKey: buildDedupKey(item.url),
                selectedForUpgrade: false,
                selectionReason: 'unreviewed'
              };
            })
          );
        }

        diagnostics.push(
          buildDiagnostic({
            providerId: adapter.id,
            status: 'success',
            degraded: false,
            reason: 'ok',
            durationMs: Date.now() - started,
            resultCount: rawResults.filter((item) => item.provider === adapter.id).length
          })
        );
      } catch (error) {
        diagnostics.push(
          buildDiagnostic({
            providerId: adapter.id,
            status: 'degraded',
            degraded: true,
            reason: error instanceof Error ? error.message : 'unknown-error',
            durationMs: Date.now() - started,
            resultCount: 0
          })
        );
        downgradeInfo.push({
          providerId: adapter.id,
          status: 'degraded',
          reason: error instanceof Error ? error.message : 'unknown-error',
          phase: 'execution',
          occurredAt: nowIso()
        });
      }
    }

    const results = dedupeResults(rawResults).map((item) => {
      const selectedForUpgrade =
        effectivePolicy.allowDomains.includes(item.domain) &&
        !effectivePolicy.denyDomains.includes(item.domain) &&
        item.sourceKindGuess === 'official';

      return {
        ...item,
        selectedForUpgrade,
        selectionReason: selectedForUpgrade ? 'official-domain' : 'not-selected'
      };
    });

    const upgradeCandidates: UpgradeCandidate[] = results
      .filter((item) => item.selectedForUpgrade)
      .map((item) => ({
        searchResultId: item.id,
        searchRunId,
        opportunityId: request.opportunityId,
        workflowId: request.workflowId,
        recommendedAction: 'http',
        reason: 'official domain match',
        priority: 100 - item.rank,
        requiresHumanReview: false,
        proposedSourceKind: 'official',
        proposedUseAs: 'primary'
      }));

    if (request.autoUpgrade && dispatchCollectorRequests) {
      await dispatchCollectorRequests(upgradeCandidates);
    }

    const result: SearchRunResult = {
      searchRun: {
        id: searchRunId,
        projectId: effectiveProjectId,
        opportunityId: request.opportunityId,
        workflowId: request.workflowId,
        taskId: request.taskId,
        purpose: request.purpose,
        query: request.query,
        status: 'completed',
        selectedProviders: selectedProviderIds,
        degradedProviders: downgradeInfo.map((item) => item.providerId),
        startedAt,
        finishedAt: nowIso()
      },
      results,
      upgradeCandidates,
      diagnostics,
      downgradeInfo
    };

    runStore.saveRun(result);
    return result;
  },

  async upgradeCandidates(
    searchRunId: string,
    selection: { selectedSearchResultIds: string[] }
  ): Promise<UpgradeDispatchResult> {
    const searchRun = runStore.getRun(searchRunId);
    const selectedCandidates =
      searchRun?.upgradeCandidates.filter((candidate) =>
        selection.selectedSearchResultIds.includes(candidate.searchResultId)
      ) ?? [];

    if (dispatchCollectorRequests) {
      await dispatchCollectorRequests(selectedCandidates);
    }

    return {
      searchRunId,
      dispatchedCount: selectedCandidates.length,
      skippedCount: 0,
      collectorRequests: selectedCandidates
        .filter((candidate) => candidate.recommendedAction !== 'skip')
        .map((candidate) => ({
          searchResultId: candidate.searchResultId,
          action: candidate.recommendedAction,
          url:
            searchRun?.results.find((result) => result.id === candidate.searchResultId)
              ?.url ?? ''
        })),
      warnings: []
    };
  }
});

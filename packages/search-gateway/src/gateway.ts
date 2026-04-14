import { createId, nowIso } from '@openfons/shared';
import {
  SearchProviderIdSchema,
  type DowngradeInfo,
  type ProviderDiagnostic,
  type RetrievalAttempt,
  type RetrievalOutcome,
  type SearchProviderId,
  type SearchRequest,
  type SearchResult,
  type SearchRunResult,
  type SourceReadiness,
  type UpgradeCandidate,
  type UpgradeDispatchResult
} from '@openfons/contracts';
import { buildDedupKey, dedupeResults } from './dedupe.js';
import {
  buildDiagnostic,
  guessSourceKind,
  normalizeDomain,
  type SearchProviderAdapter
} from './providers/base.js';
import { resolveEffectiveSearchPolicy, type SearchPolicy } from './policy.js';
import {
  appendAttempt,
  buildAttemptDecisionBasis,
  buildBlockedOutcome,
  buildRetrievalPlan
} from './retrieval.js';

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
  resolveSourceReadiness,
  runStore = createDefaultRunStore()
}: {
  projectId: string;
  providers: Partial<Record<SearchProviderId, SearchProviderAdapter>>;
  dispatchCollectorRequests?: (candidates: UpgradeCandidate[]) => Promise<void>;
  resolvePolicy?: (input: {
    projectId: string;
    purpose: SearchRequest['purpose'];
  }) => SearchPolicy;
  resolveSourceReadiness?: (input: {
    projectId: string;
    request: SearchRequest;
  }) => SourceReadiness | undefined;
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
    const sourceReadiness = resolveSourceReadiness?.({
      projectId: effectiveProjectId,
      request
    });
    const retrievalPlan = sourceReadiness
      ? buildRetrievalPlan({
          sourceReadiness,
          requestedProviders: selectedProviderIds,
          generatedAt: startedAt
        })
      : undefined;
    const diagnostics: ProviderDiagnostic[] = [];
    const downgradeInfo: DowngradeInfo[] =
      retrievalPlan?.omissions.flatMap((item) => {
        const providerId = SearchProviderIdSchema.safeParse(item.routeKey);

        if (!providerId.success) {
          return [];
        }

        return [
          {
            providerId: providerId.data,
            status: item.status,
            reason: item.reason,
            phase: 'orchestration',
            occurredAt: startedAt
          }
        ];
      }) ?? [];
    const rawResults: SearchResult[] = [];
    let attempts: RetrievalAttempt[] = [];
    const routeOrder = retrievalPlan
      ? retrievalPlan.candidates.map(
          (candidate) => candidate.routeKey as SearchProviderId
        )
      : selectedProviderIds;

    for (const [attemptIndex, providerId] of routeOrder.entries()) {
      const adapter = providers[providerId];
      const started = Date.now();
      const attemptStartedAt = nowIso();

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
        attempts = appendAttempt(attempts, {
          sourceId: 'search',
          routeKey: providerId,
          attemptIndex,
          startedAt: attemptStartedAt,
          finishedAt: nowIso(),
          decisionBasis: 'missing-adapter',
          result: 'failed'
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
        attempts = appendAttempt(attempts, {
          sourceId: 'search',
          routeKey: providerId,
          attemptIndex,
          startedAt: attemptStartedAt,
          finishedAt: nowIso(),
          decisionBasis: buildAttemptDecisionBasis({
            routeKey: providerId,
            plan: retrievalPlan
          }),
          result: 'succeeded'
        });
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
        attempts = appendAttempt(attempts, {
          sourceId: 'search',
          routeKey: providerId,
          attemptIndex,
          startedAt: attemptStartedAt,
          finishedAt: nowIso(),
          decisionBasis: error instanceof Error ? error.message : 'unknown-error',
          result: 'failed'
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

    const retrievalOutcome: RetrievalOutcome | undefined =
      retrievalPlan && retrievalPlan.candidates.length === 0
        ? buildBlockedOutcome(retrievalPlan)
        : retrievalPlan
          ? {
              sourceId: retrievalPlan.sourceId,
              planVersion: retrievalPlan.planVersion,
              attempts,
              selectedRoute:
                attempts.find((attempt) => attempt.result === 'succeeded')?.routeKey,
              status: attempts.some((attempt) => attempt.result === 'succeeded')
                ? attempts.some((attempt) => attempt.result !== 'succeeded')
                  ? 'partial'
                  : 'succeeded'
                : attempts.length > 0
                  ? 'failed'
                  : 'blocked',
              omissions: retrievalPlan.omissions
            }
          : undefined;
    const executedProviders = Array.from(
      new Set(
        attempts.map((attempt) => attempt.routeKey as SearchProviderId)
      )
    );

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
        selectedProviders: executedProviders,
        degradedProviders: downgradeInfo.map((item) => item.providerId),
        startedAt,
        finishedAt: nowIso()
      },
      results,
      upgradeCandidates,
      diagnostics,
      downgradeInfo,
      retrievalPlan,
      retrievalOutcome
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

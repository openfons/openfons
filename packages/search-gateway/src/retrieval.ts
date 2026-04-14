import { nowIso } from '@openfons/shared';
import type {
  RetrievalAttempt,
  RetrievalCandidate,
  RetrievalOutcome,
  RetrievalPlan,
  RetrievalOmission,
  SearchProviderId,
  SourceReadiness
} from '@openfons/contracts';

const PRIORITY_BY_TIER: Record<RetrievalCandidate['qualityTier'], number> = {
  primary: 100,
  fallback: 80,
  supplemental: 60
};

const STATUS_PENALTY: Record<RetrievalCandidate['status'], number> = {
  ready: 0,
  degraded: 20,
  blocked: 1000
};

const buildCandidatePriority = (
  qualityTier: RetrievalCandidate['qualityTier'],
  status: RetrievalCandidate['status']
) => PRIORITY_BY_TIER[qualityTier] - STATUS_PENALTY[status];

const buildOmissionReason = ({
  routeKey,
  blockers,
  warnings
}: Pick<SourceReadiness['routes'][number], 'routeKey' | 'blockers' | 'warnings'>) =>
  blockers[0]?.message ??
  warnings[0]?.message ??
  `${routeKey} is unavailable for retrieval`;

export const buildRetrievalPlan = ({
  sourceReadiness,
  requestedProviders,
  generatedAt = nowIso()
}: {
  sourceReadiness: SourceReadiness;
  requestedProviders?: SearchProviderId[];
  generatedAt?: string;
}): RetrievalPlan => {
  const requestedRouteKeys = requestedProviders
    ? new Set<string>(requestedProviders)
    : undefined;
  const eligibleRoutes = sourceReadiness.routes.filter(
    (route) => !requestedRouteKeys || requestedRouteKeys.has(route.routeKey)
  );
  const candidates = eligibleRoutes
    .filter((route) => route.status !== 'blocked')
    .map(
      (route): RetrievalCandidate => ({
        routeKey: route.routeKey,
        qualityTier: route.qualityTier,
        status: route.status,
        priority: buildCandidatePriority(route.qualityTier, route.status),
        penaltyReason:
          route.status === 'degraded'
            ? buildOmissionReason(route)
            : undefined
      })
    )
    .sort((left, right) => right.priority - left.priority);
  const omissions: RetrievalOmission[] = eligibleRoutes
    .filter((route) => route.status === 'blocked')
    .map((route) => ({
      routeKey: route.routeKey,
      status: route.status,
      reason: buildOmissionReason(route)
    }));

  if (requestedProviders) {
    for (const providerId of requestedProviders) {
      if (!eligibleRoutes.some((route) => route.routeKey === providerId)) {
        omissions.push({
          routeKey: providerId,
          status: 'blocked',
          reason: `${providerId} is not configured in source readiness`
        });
      }
    }
  }

  return {
    sourceId: sourceReadiness.sourceId,
    planVersion: 'v1',
    generatedAt,
    candidates,
    omissions
  };
};

export const appendAttempt = (
  attempts: RetrievalAttempt[],
  attempt: RetrievalAttempt
) => [...attempts, attempt];

export const buildBlockedOutcome = (
  plan: RetrievalPlan
): RetrievalOutcome => ({
  sourceId: plan.sourceId,
  planVersion: plan.planVersion,
  attempts: [],
  status: 'blocked',
  omissions: plan.omissions
});

export const buildAttemptDecisionBasis = ({
  routeKey,
  plan
}: {
  routeKey: string;
  plan: RetrievalPlan | undefined;
}) => {
  const candidate = plan?.candidates.find((item) => item.routeKey === routeKey);
  return candidate ? `${candidate.status}-${candidate.qualityTier}` : `selected:${routeKey}`;
};

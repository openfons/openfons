import type {
  CollectionLog,
  OpportunitySpec,
  SourceCapture
} from '@openfons/contracts';
import { createCollectionLog, createSourceCapture } from '@openfons/domain-models';

const toDiscoveryUrl = (sourceId: string) =>
  `https://planning.openfons.local/discovery/${encodeURIComponent(sourceId)}`;

const toDiscoveryTitle = (sourceId: string) =>
  `Planning discovery coverage: ${sourceId}`;

const toDiscoverySummary = ({
  sourceId,
  role,
  status,
  rationale
}: {
  sourceId: string;
  role: string;
  status: string;
  rationale: string;
}) => `${sourceId} ${role} ${status}: ${rationale}`.slice(0, 220);

const toLogStatus = (status: string): CollectionLog['status'] =>
  status === 'covered' ? 'success' : 'warning';

export const buildPlanningDiscoveryAudit = ({
  opportunity,
  topicRunId
}: {
  opportunity: OpportunitySpec;
  topicRunId: string;
}): {
  sourceCaptures: SourceCapture[];
  collectionLogs: CollectionLog[];
} => {
  const sourceCoverage = opportunity.planning?.trace.sourceCoverage ?? [];

  if (sourceCoverage.length === 0) {
    return {
      sourceCaptures: [],
      collectionLogs: []
    };
  }

  const sourceCaptures = sourceCoverage.map((source) =>
    createSourceCapture({
      topicRunId,
      title: toDiscoveryTitle(source.sourceId),
      url: toDiscoveryUrl(source.sourceId),
      sourceKind: 'inference',
      useAs: 'discovery-only',
      reportability: 'blocked',
      riskLevel: 'low',
      captureType: 'analysis-note',
      language: opportunity.language,
      region: opportunity.geo,
      summary: toDiscoverySummary(source)
    })
  );

  const collectionLogs = sourceCoverage.map((source, index) =>
    createCollectionLog({
      topicRunId,
      captureId: sourceCaptures[index]?.id,
      step: 'discover',
      status: toLogStatus(source.status),
      message: `Planning discovery coverage ${source.sourceId}: ${source.status} (${source.role}) - ${source.rationale}`
    })
  );

  return {
    sourceCaptures,
    collectionLogs
  };
};

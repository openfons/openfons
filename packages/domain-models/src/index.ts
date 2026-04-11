import { createId, nowIso } from '@openfons/shared';

export type SourceKind =
  | 'official'
  | 'community'
  | 'commercial'
  | 'inference';

export type SourceUseAs =
  | 'primary'
  | 'secondary'
  | 'corroboration'
  | 'discovery-only';

export type Reportability = 'reportable' | 'caveated' | 'blocked';
export type RiskLevel = 'low' | 'medium' | 'high';

export type CaptureType =
  | 'pricing-page'
  | 'availability-page'
  | 'doc-page'
  | 'community-thread'
  | 'analysis-note';

export type CaptureStatus = 'captured' | 'failed';
export type TopicRunStatus = 'planned' | 'captured' | 'qualified' | 'compiled';
export type CollectionStep = 'discover' | 'capture' | 'qualify' | 'compile';
export type CollectionStatus = 'success' | 'warning' | 'error';

export type EvidenceKind =
  | 'pricing'
  | 'availability'
  | 'routing'
  | 'language'
  | 'community'
  | 'inference';

export type ArtifactType =
  | 'opportunity'
  | 'topic-run'
  | 'evidence-set'
  | 'report';

export type ArtifactStorage = 'memory' | 'file';

export type TopicRun = {
  id: string;
  opportunityId: string;
  workflowId: string;
  topicKey: string;
  status: TopicRunStatus;
  startedAt: string;
  updatedAt: string;
};

export type SourceCapture = {
  id: string;
  topicRunId: string;
  title: string;
  url: string;
  sourceKind: SourceKind;
  useAs: SourceUseAs;
  reportability: Reportability;
  riskLevel: RiskLevel;
  captureType: CaptureType;
  status: CaptureStatus;
  accessedAt: string;
  capturedAt?: string;
  language: string;
  region: string;
  summary: string;
};

export type CollectionLog = {
  id: string;
  topicRunId: string;
  captureId?: string;
  step: CollectionStep;
  status: CollectionStatus;
  message: string;
  createdAt: string;
};

export type Evidence = {
  id: string;
  topicRunId: string;
  captureId: string;
  kind: EvidenceKind;
  statement: string;
  sourceKind: SourceKind;
  useAs: SourceUseAs;
  reportability: Reportability;
  riskLevel: RiskLevel;
  freshnessNote: string;
  supportingCaptureIds: string[];
};

export type EvidenceSet = {
  id: string;
  topicRunId: string;
  createdAt: string;
  updatedAt: string;
  items: Evidence[];
};

export type Artifact = {
  id: string;
  topicRunId: string;
  reportId?: string;
  type: ArtifactType;
  storage: ArtifactStorage;
  uri: string;
  createdAt: string;
};

export type CreateSourceCaptureInput = {
  topicRunId: string;
  title: string;
  url: string;
  sourceKind: SourceKind;
  useAs: SourceUseAs;
  reportability: Reportability;
  riskLevel: RiskLevel;
  captureType: CaptureType;
  language: string;
  region: string;
  summary: string;
};

export type CreateCollectionLogInput = {
  topicRunId: string;
  captureId?: string;
  step: CollectionStep;
  status: CollectionStatus;
  message: string;
};

const createTimestampPair = () => {
  const timestamp = nowIso();
  return {
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

export const createTopicRun = (
  opportunityId: string,
  workflowId: string,
  topicKey: string
): TopicRun => {
  const { createdAt, updatedAt } = createTimestampPair();

  return {
    id: createId('run'),
    opportunityId,
    workflowId,
    topicKey,
    status: 'planned',
    startedAt: createdAt,
    updatedAt
  };
};

export const createSourceCapture = ({
  topicRunId,
  title,
  url,
  sourceKind,
  useAs,
  reportability,
  riskLevel,
  captureType,
  language,
  region,
  summary
}: CreateSourceCaptureInput): SourceCapture => {
  const { createdAt } = createTimestampPair();

  return {
    id: createId('cap'),
    topicRunId,
    title,
    url,
    sourceKind,
    useAs,
    reportability,
    riskLevel,
    captureType,
    status: 'captured',
    accessedAt: createdAt,
    capturedAt: createdAt,
    language,
    region,
    summary
  };
};

export const createCollectionLog = ({
  topicRunId,
  captureId,
  step,
  status,
  message
}: CreateCollectionLogInput): CollectionLog => ({
  id: createId('log'),
  topicRunId,
  captureId,
  step,
  status,
  message,
  createdAt: nowIso()
});

export const createEvidenceSet = (topicRunId: string): EvidenceSet => {
  const { createdAt, updatedAt } = createTimestampPair();

  return {
    id: createId('es'),
    topicRunId,
    createdAt,
    updatedAt,
    items: []
  };
};

export const addEvidence = (
  evidenceSet: EvidenceSet,
  evidence: Evidence
): EvidenceSet => ({
  ...evidenceSet,
  updatedAt: nowIso(),
  items: [...evidenceSet.items, evidence]
});

type CreateArtifactOptions = {
  storage?: ArtifactStorage;
};

export const createArtifact = (
  topicRunId: string,
  type: ArtifactType,
  uri: string,
  reportId?: string,
  options: CreateArtifactOptions = {}
): Artifact => ({
  id: createId('art'),
  topicRunId,
  reportId,
  type,
  storage: options.storage ?? 'memory',
  uri,
  createdAt: nowIso()
});

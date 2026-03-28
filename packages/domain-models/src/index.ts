import { createId, nowIso } from '@openfons/shared';

export type TopicStatus = 'draft' | 'ready';
export type ArtifactType = 'opportunity' | 'report';

export type Topic = {
  id: string;
  query: string;
  market: string;
  audience: string;
  status: TopicStatus;
};

export type Evidence = {
  id: string;
  source: string;
  title: string;
  url: string;
  collectedAt: string;
  summary: string;
};

export type EvidenceSet = {
  id: string;
  topicId: string;
  createdAt: string;
  items: Evidence[];
};

export type Artifact = {
  id: string;
  topicId: string;
  type: ArtifactType;
  storage: 'memory' | 'file';
  uri: string;
  createdAt: string;
};

export const createEvidenceSet = (topicId: string): EvidenceSet => ({
  id: createId('es'),
  topicId,
  createdAt: nowIso(),
  items: []
});

export const addEvidence = (
  evidenceSet: EvidenceSet,
  evidence: Evidence
): EvidenceSet => ({
  ...evidenceSet,
  items: [...evidenceSet.items, evidence]
});

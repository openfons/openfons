import { describe, expect, it } from 'vitest';
import {
  addEvidence,
  createArtifact,
  createCollectionLog,
  createEvidenceSet,
  createSourceCapture,
  createTopicRun
} from '@openfons/domain-models';

describe('@openfons/domain-models', () => {
  it('creates a topic run with the expected ids', () => {
    const topicRun = createTopicRun('opp_001', 'wf_001', 'ai-procurement');

    expect(topicRun.opportunityId).toBe('opp_001');
    expect(topicRun.workflowId).toBe('wf_001');
    expect(topicRun.topicKey).toBe('ai-procurement');
    expect(topicRun.status).toBe('planned');
  });

  it('creates captures, logs, evidence, and artifacts immutably', () => {
    const topicRun = createTopicRun('opp_001', 'wf_001', 'ai-procurement');
    const capture = createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenAI API pricing',
      url: 'https://platform.openai.com/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Official pricing capture'
    });
    const log = createCollectionLog({
      topicRunId: topicRun.id,
      captureId: capture.id,
      step: 'capture',
      status: 'success',
      message: 'Captured pricing page.'
    });
    const initial = createEvidenceSet(topicRun.id);
    const next = addEvidence(initial, {
      id: 'evi_001',
      topicRunId: topicRun.id,
      captureId: capture.id,
      kind: 'pricing',
      statement: 'Official pricing must anchor comparisons.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Checked this run.',
      supportingCaptureIds: [capture.id]
    });
    const artifact = createArtifact(
      topicRun.id,
      'report',
      'memory://report/report_001',
      'report_001'
    );

    expect(log.captureId).toBe(capture.id);
    expect(initial.items).toHaveLength(0);
    expect(next.items).toHaveLength(1);
    expect(artifact.reportId).toBe('report_001');
  });
});

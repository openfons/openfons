import type {
  Evidence,
  OpportunitySpec,
  SourceCapture,
  WorkflowSpec
} from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createSourceCapture,
  createTopicRun
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';

export const AI_PROCUREMENT_CASE_KEY = 'ai-procurement-v1';

export const buildAiProcurementCase = (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec
) => {
  const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');

  const sourceCaptures: SourceCapture[] = [
    createSourceCapture({
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
      summary: 'Official direct-provider pricing anchor.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Google Gemini API pricing',
      url: 'https://ai.google.dev/gemini-api/docs/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Official Gemini pricing anchor.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenRouter pricing',
      url: 'https://openrouter.ai/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Official relay-platform pricing input.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenAI supported countries and territories',
      url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'availability-page',
      language: 'en',
      region: 'global',
      summary: 'Official region-availability reference.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'AI procurement workbench case memo',
      url: 'https://repo.local/docs/workbench/AI-case',
      sourceKind: 'inference',
      useAs: 'secondary',
      reportability: 'caveated',
      riskLevel: 'medium',
      captureType: 'analysis-note',
      language: 'zh-CN',
      region: 'global',
      summary:
        'Curated internal reasoning summary for the first deterministic run.'
    })
  ];

  const collectionLogs = sourceCaptures.map((capture) =>
    createCollectionLog({
      topicRunId: topicRun.id,
      captureId: capture.id,
      step: 'capture',
      status: 'success',
      message: `Captured ${capture.title}`
    })
  );

  const evidenceSet = createEvidenceSet(topicRun.id);
  const evidenceItems: Evidence[] = [
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[0].id,
      kind: 'pricing',
      statement:
        'Direct-provider pricing must be the baseline comparison frame.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Verified during the current run.',
      supportingCaptureIds: [sourceCaptures[0].id, sourceCaptures[1].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[2].id,
      kind: 'routing',
      statement:
        'Relay platforms improve vendor coverage but need caveated treatment when comparing final cost.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'Relay prices can change outside direct-provider announcements.',
      supportingCaptureIds: [sourceCaptures[2].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[3].id,
      kind: 'availability',
      statement:
        'Region availability must be handled as a first-class comparison field, not an afterthought.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Official region lists were checked during the run.',
      supportingCaptureIds: [sourceCaptures[3].id]
    }
  ];

  return {
    topicRun: {
      ...topicRun,
      status: 'compiled' as const,
      updatedAt: nowIso()
    },
    sourceCaptures,
    collectionLogs,
    evidenceSet: {
      ...evidenceSet,
      updatedAt: nowIso(),
      items: evidenceItems
    }
  };
};

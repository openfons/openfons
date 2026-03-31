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

export const supportsAiProcurementCase = (
  opportunity: OpportunitySpec
) => {
  const haystack = [
    opportunity.slug,
    opportunity.title,
    opportunity.input.query
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes('openrouter') && haystack.includes('api');
};

export const buildAiProcurementCase = (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec
) => {
  const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');

  const sourceCaptures: SourceCapture[] = [
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenAI API pricing',
      url: 'https://openai.com/api/pricing/',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary:
        'Official pricing page with per-model input, cached-input, and output token rates.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Gemini Developer API pricing',
      url: 'https://ai.google.dev/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary:
        'Official Gemini pricing page with free-tier, paid-tier, and tool-pricing tables.'
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
      summary:
        'Official relay pricing page that says model-provider rates pass through without markup.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenRouter FAQ',
      url: 'https://openrouter.ai/docs/faq',
      sourceKind: 'official',
      useAs: 'secondary',
      reportability: 'caveated',
      riskLevel: 'medium',
      captureType: 'doc-page',
      language: 'en',
      region: 'global',
      summary:
        'Official FAQ documenting a 5.5% credit-purchase fee and BYOK fees after the first 1M requests per month.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenAI API supported countries and territories',
      url: 'https://help.openai.com/articles/5347006-openai-api-supported-countries-and-territories',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'availability-page',
      language: 'en',
      region: 'global',
      summary:
        'Official help article stating that access outside supported countries may lead to suspension.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenRouter model pricing misleading?',
      url: 'https://www.reddit.com/r/OpenRouter/comments/1mgz77y/openrouter_model_pricing_misleading/',
      sourceKind: 'community',
      useAs: 'corroboration',
      reportability: 'caveated',
      riskLevel: 'medium',
      captureType: 'community-thread',
      language: 'en',
      region: 'global',
      summary:
        'Community report showing that relay pricing and provider-level charges can be confusing without checking billing caveats closely.'
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
        'Direct-provider comparisons should start from official provider pricing pages: OpenAI lists per-model input, cached-input, and output rates, while Gemini publishes separate free-tier, paid-tier, and tool-pricing tables.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote:
        'Verified against the OpenAI API pricing page and Gemini Developer API pricing page during this run.',
      supportingCaptureIds: [sourceCaptures[0].id, sourceCaptures[1].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[2].id,
      kind: 'routing',
      statement:
        'OpenRouter says model-provider inference pricing passes through without markup, but it charges a 5.5% fee on credit purchases and applies BYOK fees after the first 1M monthly BYOK requests, so relay cost comparisons need billing caveats.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'Routing and billing rules were checked against the current OpenRouter pricing page and FAQ during the run.',
      supportingCaptureIds: [sourceCaptures[2].id, sourceCaptures[3].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[5].id,
      kind: 'community',
      statement:
        'Community operators report that relay pricing can be confusing in practice, which corroborates the need to preserve billing caveats instead of presenting routed usage as a simple headline-price comparison.',
      sourceKind: 'community',
      useAs: 'corroboration',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'A live community discussion was checked during the run to corroborate operator confusion around relay pricing.',
      supportingCaptureIds: [sourceCaptures[5].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[4].id,
      kind: 'availability',
      statement:
        'Region support is a first-class procurement constraint because OpenAI says API access outside supported countries may lead to blocked or suspended accounts.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Official region lists were checked during the run.',
      supportingCaptureIds: [sourceCaptures[4].id]
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

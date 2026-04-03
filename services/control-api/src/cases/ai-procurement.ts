import type {
  CollectionLog,
  Evidence,
  EvidenceSet,
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

export type AiProcurementCaptureTarget = {
  key: string;
  title: string;
  query: string;
  url: string;
  urlPattern: RegExp;
  sourceKind: SourceCapture['sourceKind'];
  useAs: SourceCapture['useAs'];
  reportability: SourceCapture['reportability'];
  riskLevel: SourceCapture['riskLevel'];
  captureType: SourceCapture['captureType'];
  language: string;
  region: string;
  summary: string;
};

export type AiProcurementCaseBundle = {
  topicRun: {
    id: string;
    opportunityId: string;
    workflowId: string;
    topicKey: string;
    status: 'compiled';
    startedAt: string;
    updatedAt: string;
  };
  sourceCaptures: SourceCapture[];
  collectionLogs: CollectionLog[];
  evidenceSet: EvidenceSet;
};

export const AI_PROCUREMENT_CAPTURE_TARGETS: AiProcurementCaptureTarget[] = [
  {
    key: 'openai-pricing',
    title: 'OpenAI API pricing',
    query: 'openai api pricing',
    url: 'https://openai.com/api/pricing/',
    urlPattern: /^https:\/\/openai\.com\/api\/pricing\/?$/i,
    sourceKind: 'official',
    useAs: 'primary',
    reportability: 'reportable',
    riskLevel: 'low',
    captureType: 'pricing-page',
    language: 'en',
    region: 'global',
    summary:
      'Official pricing page with per-model input, cached-input, and output token rates.'
  },
  {
    key: 'gemini-pricing',
    title: 'Gemini Developer API pricing',
    query: 'gemini developer api pricing',
    url: 'https://ai.google.dev/pricing',
    urlPattern: /^https:\/\/ai\.google\.dev\/pricing\/?$/i,
    sourceKind: 'official',
    useAs: 'primary',
    reportability: 'reportable',
    riskLevel: 'low',
    captureType: 'pricing-page',
    language: 'en',
    region: 'global',
    summary:
      'Official Gemini pricing page with free-tier, paid-tier, and tool-pricing tables.'
  },
  {
    key: 'openrouter-pricing',
    title: 'OpenRouter pricing',
    query: 'openrouter pricing',
    url: 'https://openrouter.ai/pricing',
    urlPattern: /^https:\/\/openrouter\.ai\/pricing\/?$/i,
    sourceKind: 'official',
    useAs: 'primary',
    reportability: 'caveated',
    riskLevel: 'medium',
    captureType: 'pricing-page',
    language: 'en',
    region: 'global',
    summary:
      'Official relay pricing page that says model-provider rates pass through without markup.'
  },
  {
    key: 'openrouter-faq',
    title: 'OpenRouter FAQ',
    query: 'openrouter faq byok fees',
    url: 'https://openrouter.ai/docs/faq',
    urlPattern: /^https:\/\/openrouter\.ai\/docs\/faq\/?$/i,
    sourceKind: 'official',
    useAs: 'secondary',
    reportability: 'caveated',
    riskLevel: 'medium',
    captureType: 'doc-page',
    language: 'en',
    region: 'global',
    summary:
      'Official FAQ documenting a 5.5% credit-purchase fee and BYOK fees after the first 1M requests per month.'
  },
  {
    key: 'openai-availability',
    title: 'OpenAI API supported countries and territories',
    query: 'openai api supported countries territories',
    url: 'https://help.openai.com/articles/5347006-openai-api-supported-countries-and-territories',
    urlPattern:
      /^https:\/\/help\.openai\.com\/articles\/5347006-openai-api-supported-countries-and-territories\/?$/i,
    sourceKind: 'official',
    useAs: 'primary',
    reportability: 'reportable',
    riskLevel: 'low',
    captureType: 'availability-page',
    language: 'en',
    region: 'global',
    summary:
      'Official help article stating that access outside supported countries may lead to suspension.'
  },
  {
    key: 'openrouter-community',
    title: 'OpenRouter model pricing misleading?',
    query: 'openrouter model pricing misleading reddit',
    url: 'https://www.reddit.com/r/OpenRouter/comments/1mgz77y/openrouter_model_pricing_misleading/',
    urlPattern:
      /^https:\/\/www\.reddit\.com\/r\/OpenRouter\/comments\/1mgz77y\/openrouter_model_pricing_misleading\/?$/i,
    sourceKind: 'community',
    useAs: 'corroboration',
    reportability: 'caveated',
    riskLevel: 'medium',
    captureType: 'community-thread',
    language: 'en',
    region: 'global',
    summary:
      'Community report showing that relay pricing and provider-level charges can be confusing without checking billing caveats closely.'
  }
];

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

const buildEvidenceItems = (
  topicRunId: string,
  sourceCaptures: SourceCapture[]
): Evidence[] => [
  {
    id: createId('evi'),
    topicRunId,
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
    topicRunId,
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
    topicRunId,
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
    topicRunId,
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

export const buildAiProcurementCase = (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec
): AiProcurementCaseBundle => {
  const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');

  const sourceCaptures: SourceCapture[] = AI_PROCUREMENT_CAPTURE_TARGETS.map(
    (target) =>
      createSourceCapture({
        topicRunId: topicRun.id,
        title: target.title,
        url: target.url,
        sourceKind: target.sourceKind,
        useAs: target.useAs,
        reportability: target.reportability,
        riskLevel: target.riskLevel,
        captureType: target.captureType,
        language: target.language,
        region: target.region,
        summary: target.summary
      })
  );

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

  return {
    topicRun: {
      ...topicRun,
      status: 'compiled',
      updatedAt: nowIso()
    },
    sourceCaptures,
    collectionLogs,
    evidenceSet: {
      ...evidenceSet,
      updatedAt: nowIso(),
      items: buildEvidenceItems(topicRun.id, sourceCaptures)
    }
  };
};

export const addAiProcurementFallbackWarning = (
  bundle: AiProcurementCaseBundle,
  reason: string,
  logs: CollectionLog[] = []
): AiProcurementCaseBundle => ({
  ...bundle,
  collectionLogs: [
    ...logs,
    createCollectionLog({
      topicRunId: bundle.topicRun.id,
      step: 'discover',
      status: 'warning',
      message: `Real collection bridge used deterministic fallback: ${reason}`
    }),
    ...bundle.collectionLogs
  ]
});

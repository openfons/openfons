import type { Evidence, OpportunitySpec, ReportSpec, SourceCapture } from '@openfons/contracts';
import type { AiProcurementFamily } from './ai-procurement-intake.js';

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

export type AiProcurementEvidenceTemplate = {
  kind: Evidence['kind'];
  captureKey: string;
  statement: string;
  sourceKind: Evidence['sourceKind'];
  useAs: Evidence['useAs'];
  reportability: Evidence['reportability'];
  riskLevel: Evidence['riskLevel'];
  freshnessNote: string;
  supportingCaptureKeys: string[];
};

export type AiProcurementReportClaimTemplate = {
  id: string;
  label: string;
  statement: string;
  evidenceIndexes: number[];
};

export type AiProcurementReportSectionTemplate = Pick<
  ReportSpec['sections'][number],
  'title' | 'body'
>;

export type AiProcurementProfile = {
  family: AiProcurementFamily;
  captureTargets: AiProcurementCaptureTarget[];
  evidenceTemplates: AiProcurementEvidenceTemplate[];
  report: {
    summary: string;
    thesis: string;
    sections: AiProcurementReportSectionTemplate[];
    evidenceBoundaries: string[];
    risks: string[];
    claims: AiProcurementReportClaimTemplate[];
  };
};

const OPENAI_PRICING_TARGET: AiProcurementCaptureTarget = {
  key: 'openai-pricing',
  title: 'OpenAI API pricing',
  query: 'site:openai.com openai api pricing',
  url: 'https://openai.com/api/pricing/',
  urlPattern: /^https:\/\/openai\.com\/api\/pricing\/?(?:\?[^#]*)?$/i,
  sourceKind: 'official',
  useAs: 'primary',
  reportability: 'reportable',
  riskLevel: 'low',
  captureType: 'pricing-page',
  language: 'en',
  region: 'global',
  summary:
    'Official pricing page with per-model input, cached-input, and output token rates.'
};

const GEMINI_PRICING_TARGET: AiProcurementCaptureTarget = {
  key: 'gemini-pricing',
  title: 'Gemini Developer API billing',
  query: 'site:ai.google.dev gemini api pricing',
  url: 'https://ai.google.dev/gemini-api/docs/billing',
  urlPattern:
    /^https:\/\/ai\.google\.dev\/gemini-api\/docs\/billing(?:\?[^#]*)?\/?$/i,
  sourceKind: 'official',
  useAs: 'primary',
  reportability: 'reportable',
  riskLevel: 'low',
  captureType: 'pricing-page',
  language: 'en',
  region: 'global',
  summary:
    'Official Gemini billing page with current pricing and paid-tier guidance.'
};

const OPENROUTER_PRICING_TARGET: AiProcurementCaptureTarget = {
  key: 'openrouter-pricing',
  title: 'OpenRouter pricing',
  query: 'site:openrouter.ai openrouter pricing',
  url: 'https://openrouter.ai/pricing',
  urlPattern: /^https:\/\/openrouter\.ai\/pricing\/?(?:\?[^#]*)?$/i,
  sourceKind: 'official',
  useAs: 'primary',
  reportability: 'caveated',
  riskLevel: 'medium',
  captureType: 'pricing-page',
  language: 'en',
  region: 'global',
  summary:
    'Official relay pricing page that says model-provider rates pass through without markup.'
};

const OPENROUTER_FAQ_TARGET: AiProcurementCaptureTarget = {
  key: 'openrouter-faq',
  title: 'OpenRouter FAQ',
  query: 'site:openrouter.ai openrouter faq byok fees',
  url: 'https://openrouter.ai/docs/faq',
  urlPattern: /^https:\/\/openrouter\.ai\/docs\/faq\/?(?:\?[^#]*)?$/i,
  sourceKind: 'official',
  useAs: 'secondary',
  reportability: 'caveated',
  riskLevel: 'medium',
  captureType: 'doc-page',
  language: 'en',
  region: 'global',
  summary:
    'Official FAQ documenting a 5.5% credit-purchase fee and BYOK fees after the first 1M requests per month.'
};

const OPENAI_AVAILABILITY_TARGET: AiProcurementCaptureTarget = {
  key: 'openai-availability',
  title: 'OpenAI API supported countries and territories',
  query: 'site:help.openai.com 5347006 openai api supported countries territories',
  url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories',
  urlPattern:
    /^https:\/\/help\.openai\.com\/[a-z-]+\/articles\/5347006-openai-api-supported-countries-and-territories\/?$/i,
  sourceKind: 'official',
  useAs: 'primary',
  reportability: 'reportable',
  riskLevel: 'low',
  captureType: 'availability-page',
  language: 'en',
  region: 'global',
  summary:
    'Official help article stating that access outside supported countries may lead to suspension.'
};

const OPENROUTER_COMMUNITY_TARGET: AiProcurementCaptureTarget = {
  key: 'openrouter-community',
  title: 'OpenRouter streaming does not return cost and is_byok',
  query: 'openrouter byok github issue',
  url: 'https://github.com/BerriAI/litellm/issues/11626',
  urlPattern:
    /^https:\/\/github\.com\/BerriAI\/litellm\/issues\/11626\/?(?:\?[^#]*)?$/i,
  sourceKind: 'community',
  useAs: 'corroboration',
  reportability: 'caveated',
  riskLevel: 'medium',
  captureType: 'community-thread',
  language: 'en',
  region: 'global',
  summary:
    'Community issue showing that cost and BYOK billing signals can be unclear in OpenRouter integrations.'
};

export const AI_PROCUREMENT_VENDOR_CHOICE_PROFILE: AiProcurementProfile = {
  family: 'vendor-choice',
  captureTargets: [
    OPENAI_PRICING_TARGET,
    GEMINI_PRICING_TARGET,
    OPENROUTER_PRICING_TARGET,
    OPENROUTER_FAQ_TARGET,
    OPENAI_AVAILABILITY_TARGET,
    OPENROUTER_COMMUNITY_TARGET
  ],
  evidenceTemplates: [
    {
      kind: 'pricing',
      captureKey: 'openai-pricing',
      statement:
        'Direct-provider comparisons should start from official provider pricing pages: OpenAI lists per-model input, cached-input, and output rates, while Gemini publishes separate free-tier, paid-tier, and tool-pricing tables.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote:
        'Verified against the OpenAI API pricing page and Gemini Developer API pricing page during this run.',
      supportingCaptureKeys: ['openai-pricing', 'gemini-pricing']
    },
    {
      kind: 'routing',
      captureKey: 'openrouter-pricing',
      statement:
        'OpenRouter says model-provider inference pricing passes through without markup, but it charges a 5.5% fee on credit purchases and applies BYOK fees after the first 1M monthly BYOK requests, so relay cost comparisons need billing caveats.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'Routing and billing rules were checked against the current OpenRouter pricing page and FAQ during the run.',
      supportingCaptureKeys: ['openrouter-pricing', 'openrouter-faq']
    },
    {
      kind: 'community',
      captureKey: 'openrouter-community',
      statement:
        'Community integrators report that OpenRouter cost and BYOK billing signals can be unclear in practice, which corroborates that relay pricing caveats should not be flattened into a simple headline-price comparison.',
      sourceKind: 'community',
      useAs: 'corroboration',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'A live community discussion was checked during the run to corroborate operator confusion around relay pricing.',
      supportingCaptureKeys: ['openrouter-community']
    },
    {
      kind: 'availability',
      captureKey: 'openai-availability',
      statement:
        'Region support is a first-class procurement constraint because OpenAI says API access outside supported countries may lead to blocked or suspended accounts.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Official region lists were checked during the run.',
      supportingCaptureKeys: ['openai-availability']
    }
  ],
  report: {
    summary:
      'Evidence-backed comparison for AI coding teams deciding between direct model APIs and OpenRouter.',
    thesis:
      'Direct APIs are the safer default when a team has stable provider choices, supported-region access, and compliance needs; OpenRouter is useful when provider coverage and routing convenience outweigh fee and billing caveats.',
    sections: [
      {
        title: 'Quick Answer',
        body:
          'Start with direct APIs when your team already knows which provider it needs, can buy in a supported region, and wants the cleanest pricing and account-control path. Consider OpenRouter when your team needs one routing layer across multiple providers, faster model switching, or simpler experiments, but do not assume it is automatically cheaper.'
      },
      {
        title: 'Executive Summary',
        body:
          'The current evidence supports a decision-page answer rather than a static price table: direct-provider pricing should anchor cost claims, relay fees and BYOK rules must stay visible, community friction shows billing signals can be unclear in integrations, and region availability can override headline price.'
      },
      {
        title: 'Where Direct API Wins',
        body:
          'Direct APIs win when the team values official billing, fewer relay-specific fee caveats, cleaner procurement records, and first-party account boundaries. They are also the safer baseline when regional availability or account suspension risk matters more than model-switching convenience.'
      },
      {
        title: 'Where OpenRouter Wins',
        body:
          'OpenRouter can win when a coding team needs fast provider coverage, a single routing surface, or simpler experiments across multiple models. The tradeoff is that routing convenience must be read together with credit-purchase fees, BYOK fee rules, and the practical visibility of cost and BYOK signals inside integrations.'
      },
      {
        title: 'Hidden Costs and Risks',
        body:
          'The hidden-cost question is not only token price. Teams must also account for credit fees, BYOK thresholds, provider availability, failed calls, unclear integration-level cost signals, billing governance, and whether a relay-owned page is the only source supporting a claim.'
      },
      {
        title: 'Decision Tree by Team Type',
        body:
          'Solo developer experimenting across many models: OpenRouter can be practical if fee caveats are acceptable. Small AI team with stable provider choices: prefer direct APIs first, then add a relay only for overflow or experiments. Team with unsupported-region risk: resolve official availability before comparing costs. Team optimizing procurement governance: keep direct billing as the baseline and treat routing as an explicit convenience layer.'
      }
    ],
    evidenceBoundaries: [
      'Do not treat a relay as cheaper unless official pricing and fee caveats are both visible.',
      'Do not publish pricing claims without at least one official pricing capture.',
      'Relay comparisons must preserve caveats when source terms come from relay-owned pages.',
      'Community pain points can corroborate workflow friction, but they cannot replace official pricing or availability terms.'
    ],
    risks: [
      'Headline price comparisons can mislead if credit-purchase fees, BYOK rules, or integration-level cost visibility are omitted.',
      'Region availability can change the procurement answer even when one route appears cheaper.',
      'Community pain points may corroborate workflow friction, but they do not override official pricing or availability.'
    ],
    claims: [
      {
        id: 'claim_direct_anchor',
        label: 'Official direct-buy baseline',
        statement:
          'Use official pricing and availability pages to set the baseline before any routing convenience claim is made.',
        evidenceIndexes: [0, 3]
      },
      {
        id: 'claim_relay_fee_context',
        label: 'OpenRouter is not automatically cheaper',
        statement:
          'OpenRouter can simplify routing and model coverage, but its cost story must preserve credit-purchase fees, BYOK thresholds, and integration-level cost-signal caveats.',
        evidenceIndexes: [1, 2]
      },
      {
        id: 'claim_relay_convenience',
        label: 'OpenRouter wins on routing convenience',
        statement:
          'OpenRouter is most defensible when routing flexibility, provider coverage, or fast experiments matter more than the cleanest first-party procurement path.',
        evidenceIndexes: [1, 2]
      },
      {
        id: 'claim_region_first',
        label: 'Region is not optional',
        statement:
          'Country availability and language support can change the best procurement path even when headline price looks cheaper elsewhere.',
        evidenceIndexes: [3]
      }
    ]
  }
};

export const AI_PROCUREMENT_PRICING_ACCESS_PROFILE: AiProcurementProfile = {
  family: 'pricing-access',
  captureTargets: [
    OPENAI_PRICING_TARGET,
    OPENROUTER_PRICING_TARGET,
    OPENROUTER_FAQ_TARGET,
    OPENROUTER_COMMUNITY_TARGET
  ],
  evidenceTemplates: [
    {
      kind: 'pricing',
      captureKey: 'openai-pricing',
      statement:
        'Official provider and relay pricing tables are the baseline for any cost comparison between direct and routed buying.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote:
        'Official pricing pages were checked during this run before any cost claim was made.',
      supportingCaptureKeys: ['openai-pricing', 'openrouter-pricing']
    },
    {
      kind: 'routing',
      captureKey: 'openrouter-pricing',
      statement:
        'Relay pricing requires explicit fee and BYOK caveats because OpenRouter convenience does not collapse into a pure headline-token-rate comparison.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'Relay billing caveats were checked against the current OpenRouter pricing page and FAQ during the run.',
      supportingCaptureKeys: ['openrouter-pricing', 'openrouter-faq']
    },
    {
      kind: 'community',
      captureKey: 'openrouter-community',
      statement:
        'Community operators report confusion around relay billing and BYOK behavior, which corroborates the need to keep billing caveats visible in pricing reports.',
      sourceKind: 'community',
      useAs: 'corroboration',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'A live community discussion was checked to corroborate billing confusion during the run.',
      supportingCaptureKeys: ['openrouter-community']
    }
  ],
  report: {
    summary: 'Evidence-backed AI procurement pricing report.',
    thesis:
      'Official pricing pages should anchor cost claims, while relay convenience must remain separated from fee and billing caveats.',
    sections: [
      {
        title: 'Pricing Baseline',
        body: 'Start from official pricing pages before comparing direct and routed buying.'
      },
      {
        title: 'Billing Caveats',
        body: 'Preserve relay billing caveats instead of flattening convenience into a simple headline-price comparison.'
      }
    ],
    evidenceBoundaries: [
      'Do not publish cost claims without current official pricing captures.',
      'Relay pricing claims must preserve fee and BYOK caveats.'
    ],
    risks: [
      'Headline price comparisons can become misleading if relay fees and BYOK rules are omitted.',
      'Community complaints can corroborate confusion but cannot replace official pricing terms.'
    ],
    claims: [
      {
        id: 'claim_pricing_anchor',
        label: 'Official pricing anchor',
        statement:
          'Official price tables must anchor direct-vs-relay cost claims.',
        evidenceIndexes: [0]
      },
      {
        id: 'claim_billing_caveat',
        label: 'Relay billing caveats matter',
        statement:
          'Relay convenience should stay caveated when fees or BYOK rules materially affect real spend.',
        evidenceIndexes: [1]
      },
      {
        id: 'claim_operator_confusion',
        label: 'Operators still need caveats',
        statement:
          'Community friction around billing is a signal that pricing reports must preserve caveats instead of presenting a single headline number.',
        evidenceIndexes: [2]
      }
    ]
  }
};

export const AI_PROCUREMENT_CAPABILITY_PROFILE: AiProcurementProfile = {
  family: 'capability-procurement',
  captureTargets: [
    OPENAI_AVAILABILITY_TARGET,
    GEMINI_PRICING_TARGET,
    OPENROUTER_COMMUNITY_TARGET
  ],
  evidenceTemplates: [
    {
      kind: 'availability',
      captureKey: 'openai-availability',
      statement:
        'Official regional availability rules are a first-class procurement constraint when teams need compliant public access.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote:
        'Official regional access guidance was checked during this run.',
      supportingCaptureKeys: ['openai-availability']
    },
    {
      kind: 'availability',
      captureKey: 'gemini-pricing',
      statement:
        'Official billing and plan documentation still matters for capability procurement because access is often scoped by plan, tool support, or paid-tier requirements.',
      sourceKind: 'official',
      useAs: 'secondary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote:
        'Official plan-access documentation was checked during this run.',
      supportingCaptureKeys: ['gemini-pricing']
    },
    {
      kind: 'community',
      captureKey: 'openrouter-community',
      statement:
        'Community operator reports help surface real-world access and billing friction that should remain visible alongside official access docs.',
      sourceKind: 'community',
      useAs: 'corroboration',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote:
        'A live community discussion was checked to corroborate operator friction during the run.',
      supportingCaptureKeys: ['openrouter-community']
    }
  ],
  report: {
    summary: 'Evidence-backed AI procurement access report.',
    thesis:
      'Capability procurement should start from official regional and plan-access rules, then use community evidence to expose operational friction.',
    sections: [
      {
        title: 'Access Boundary',
        body: 'Official region and plan-access rules should decide whether a procurement path is viable.'
      },
      {
        title: 'Operational Caveats',
        body: 'Use community corroboration to keep real-world friction visible without replacing official access guidance.'
      }
    ],
    evidenceBoundaries: [
      'Do not publish access claims without official availability or plan-access captures.',
      'Community evidence can corroborate friction but should not override official access rules.'
    ],
    risks: [
      'Access guidance can become stale if regional restrictions change and reruns are skipped.',
      'Operational anecdotes can distort the answer if they are not anchored to current official access rules.'
    ],
    claims: [
      {
        id: 'claim_access_boundary',
        label: 'Official access rules first',
        statement:
          'Regional availability and official access rules must anchor capability procurement decisions.',
        evidenceIndexes: [0]
      },
      {
        id: 'claim_plan_access_context',
        label: 'Plan access still matters',
        statement:
          'Capability procurement should keep plan-access and paid-tier requirements visible when they affect whether a path is actually usable.',
        evidenceIndexes: [1]
      },
      {
        id: 'claim_operational_friction',
        label: 'Operational friction is still real',
        statement:
          'Community operator friction should stay visible as a caveat even when official docs define the formal access boundary.',
        evidenceIndexes: [2]
      }
    ]
  }
};

export const resolveAiProcurementProfile = (
  _opportunity: OpportunitySpec,
  family: AiProcurementFamily
): AiProcurementProfile => {
  switch (family) {
    case 'pricing-access':
      return AI_PROCUREMENT_PRICING_ACCESS_PROFILE;
    case 'capability-procurement':
      return AI_PROCUREMENT_CAPABILITY_PROFILE;
    case 'vendor-choice':
      return AI_PROCUREMENT_VENDOR_CHOICE_PROFILE;
  }
};

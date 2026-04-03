import { describe, expect, it } from 'vitest';
import type { OpportunitySpec, WorkflowSpec } from '@openfons/contracts';
import { buildAiProcurementCase } from '../../services/control-api/src/cases/ai-procurement';

const opportunity: OpportunitySpec = {
  id: 'opp_001',
  slug: 'direct-api-vs-openrouter-for-ai-coding-teams',
  title: 'Direct API vs OpenRouter for AI Coding Teams',
  market: 'global',
  input: {
    title: 'Direct API vs OpenRouter for AI Coding Teams',
    query: 'direct api vs openrouter',
    market: 'global',
    audience: 'small ai teams',
    problem: 'Teams need cheaper but reliable model procurement',
    outcome: 'Produce a source-backed report',
    geo: 'global',
    language: 'English'
  },
  status: 'draft',
  createdAt: '2026-03-30T08:00:00.000Z',
  audience: 'small ai teams',
  geo: 'global',
  language: 'English',
  searchIntent: 'comparison',
  angle: 'Compare direct provider buying with relay platforms',
  firstDeliverySurface: 'report-web',
  pageCandidates: [
    {
      slug: 'direct-api-vs-openrouter-for-ai-coding-teams',
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      query: 'direct api vs openrouter'
    }
  ],
  evidenceRequirements: [
    {
      kind: 'official-pricing',
      note: 'Capture official provider and relay pricing pages.'
    }
  ],
  productOpportunityHints: [
    {
      kind: 'tracker',
      note: 'Track provider pricing and routing changes over time.'
    }
  ]
};

const workflow: WorkflowSpec = {
  id: 'wf_001',
  opportunityId: 'opp_001',
  taskIds: ['task_001', 'task_002', 'task_003'],
  status: 'ready'
};

describe('ai procurement case bundle', () => {
  it('uses only real external sources in the first evidence bundle', () => {
    const bundle = buildAiProcurementCase(opportunity, workflow);

    expect(bundle.sourceCaptures.length).toBeGreaterThanOrEqual(4);
    expect(bundle.sourceCaptures.every((capture) => capture.url.startsWith('https://'))).toBe(true);
    expect(
      bundle.sourceCaptures.some((capture) => capture.url.includes('repo.local'))
    ).toBe(false);
    expect(
      bundle.sourceCaptures.some(
        (capture) => capture.url === 'https://openai.com/api/pricing/'
      )
    ).toBe(true);
    expect(
      bundle.sourceCaptures.some(
        (capture) => capture.url === 'https://ai.google.dev/gemini-api/docs/billing'
      )
    ).toBe(true);
    expect(
      bundle.sourceCaptures.some(
        (capture) => capture.url === 'https://openrouter.ai/docs/faq'
      )
    ).toBe(true);
    expect(
      bundle.sourceCaptures.some(
        (capture) =>
          capture.url ===
          'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories'
      )
    ).toBe(true);
    expect(
      bundle.sourceCaptures.every((capture) => capture.sourceKind !== 'inference')
    ).toBe(true);
    expect(
      bundle.sourceCaptures.some((capture) => capture.sourceKind === 'community')
    ).toBe(true);
  });
});

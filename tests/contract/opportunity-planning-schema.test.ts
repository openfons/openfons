import { describe, expect, it } from 'vitest';
import {
  ConfirmOpportunityRequestSchema,
  OpportunityPlanningBundleSchema,
  OpportunityQuestionSchema,
  OpportunitySpecSchema
} from '@openfons/contracts';

describe('@openfons/contracts opportunity planning schemas', () => {
  it('rejects punctuation-only raw questions', () => {
    const parsed = OpportunityQuestionSchema.safeParse({
      question: '!!!'
    });

    expect(parsed.success).toBe(false);
  });

  it('parses a raw question and a judged planning bundle inside OpportunitySpec', () => {
    const question = OpportunityQuestionSchema.parse({
      question:
        'Should a small AI team buy model APIs directly or use a routing provider?',
      geoHint: 'US',
      languageHint: 'English'
    });

    const planning = OpportunityPlanningBundleSchema.parse({
      question,
      intent: {
        keywordSeed: question.question,
        topic: 'AI coding model procurement',
        caseKey: 'ai-procurement',
        intentCandidates: ['procurement_decision', 'routing_decision'],
        audienceCandidates: ['small AI teams'],
        geoCandidates: ['US'],
        languageCandidates: ['English']
      },
      roleBriefs: [
        {
          role: 'opportunity-judge',
          summary: 'Direct API vs router is the clearest first decision page.',
          confidence: 'medium',
          keyFindings: ['Clear buyer decision'],
          openQuestions: ['Pricing must be validated with official sources'],
          signalFamilies: ['search', 'commercial']
        }
      ],
      options: [
        {
          id: 'option_direct_vs_router',
          primaryKeyword: 'direct API vs OpenRouter',
          angle: 'official direct purchase versus routing platform tradeoff',
          audience: 'small AI teams',
          geo: 'US',
          language: 'English',
          searchIntent: 'comparison',
          rationale: 'Strong procurement decision intent',
          riskNotes: ['Do not publish unsupported price claims']
        }
      ],
      recommendedOptionId: 'option_direct_vs_router',
      approval: {
        status: 'pending_user_confirmation'
      },
      trace: {
        steps: [
          {
            step: 'judge_opportunity',
            status: 'completed',
            summary: 'Selected one comparison option for user confirmation'
          }
        ],
        sourceCoverage: [],
        searchRunIds: [],
        openQuestions: ['Validate pricing and region availability'],
        contradictions: []
      }
    });

    const spec = OpportunitySpecSchema.parse({
      id: 'opp_001',
      slug: 'direct-api-vs-openrouter',
      title: 'Direct API vs OpenRouter',
      market: 'US',
      input: {
        title: 'Direct API vs OpenRouter',
        query: 'direct API vs OpenRouter',
        market: 'US',
        audience: 'small AI teams',
        problem: 'Teams need to choose a safe procurement path',
        outcome: 'Produce a source-backed comparison report',
        geo: 'US',
        language: 'English'
      },
      status: 'draft',
      createdAt: '2026-04-14T00:00:00.000Z',
      audience: 'small AI teams',
      geo: 'US',
      language: 'English',
      searchIntent: 'comparison',
      angle: 'official direct purchase versus routing platform tradeoff',
      firstDeliverySurface: 'report-web',
      pageCandidates: [
        {
          slug: 'direct-api-vs-openrouter',
          title: 'Direct API vs OpenRouter',
          query: 'direct API vs OpenRouter'
        }
      ],
      evidenceRequirements: [
        {
          kind: 'official-pricing',
          note: 'Capture official pricing pages.'
        }
      ],
      productOpportunityHints: [],
      planning
    });

    const confirmation = ConfirmOpportunityRequestSchema.parse({
      selectedOptionId: 'option_direct_vs_router',
      confirmationNotes: 'Proceed with this page angle.'
    });

    expect(spec.planning?.approval.status).toBe('pending_user_confirmation');
    expect(confirmation.selectedOptionId).toBe('option_direct_vs_router');
  });
});

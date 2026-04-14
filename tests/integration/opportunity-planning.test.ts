import { describe, expect, it } from 'vitest';
import {
  buildCompilation,
  buildOpportunity
} from '../../services/control-api/src/compiler.js';
import {
  buildOpportunityIntakeProfile,
  buildPlanningSignalBrief
} from '../../services/control-api/src/planning/signal-brief.js';
import { planOpportunityFromQuestion } from '../../services/control-api/src/planning/pipeline.js';

describe('opportunity planning signal brief', () => {
  it('builds a comparison-oriented signal brief for ai procurement inputs', () => {
    const signalBrief = buildPlanningSignalBrief({
      title: 'OpenAI API vs OpenRouter for AI Coding Teams',
      query: 'openai api vs openrouter for ai coding teams',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Need to compare direct provider buying against relay routing',
      outcome: 'Choose the safer procurement path',
      geo: 'global',
      language: 'English'
    });

    expect(signalBrief.lookbackDays).toBe(30);
    expect(signalBrief.comparisonMode).toBe(true);
    expect(signalBrief.candidateEntities).toEqual(
      expect.arrayContaining(['OpenAI', 'OpenRouter'])
    );
    expect(signalBrief.sourceCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'web', role: 'required' }),
        expect.objectContaining({ sourceId: 'reddit', role: 'recommended' }),
        expect.objectContaining({ sourceId: 'hacker-news', role: 'recommended' })
      ])
    );
  });

  it('builds intake guidance that keeps trend-watch topics in a last30days pass', () => {
    const input = {
      title: 'Recent OpenAI pricing changes in the last 30 days',
      query: 'recent openai pricing changes last 30 days',
      market: 'global',
      audience: 'product teams',
      problem: 'Need to understand what changed recently',
      outcome: 'Decide whether to update pricing guidance',
      geo: 'global',
      language: 'English'
    };

    const signalBrief = buildPlanningSignalBrief(input);
    const intakeProfile = buildOpportunityIntakeProfile(input, signalBrief);

    expect(intakeProfile.intakeKind).toBe('trend-watch');
    expect(intakeProfile.researchMode).toBe('last30days-brief');
    expect(intakeProfile.notes[2]).toContain('recent-signal pass');
  });

  it('attaches planning subobjects to the opportunity spec without changing the main compile contract', () => {
    const opportunity = buildOpportunity({
      title: 'OpenAI API vs OpenRouter for AI Coding Teams',
      query: 'openai api vs openrouter for ai coding teams',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Need to compare direct provider buying against relay routing',
      outcome: 'Choose the safer procurement path',
      geo: 'global',
      language: 'English'
    });

    expect(opportunity.planningSignalBrief).toMatchObject({
      comparisonMode: true,
      lookbackDays: 30
    });
    expect(opportunity.searchIntent).toBe('comparison');
    expect(opportunity.intakeProfile).toMatchObject({
      intakeKind: 'comparison',
      researchMode: 'hybrid',
      acceptedDelivery: 'report-web'
    });
  });

  it('aligns searchIntent with trend-watch intake profiles', () => {
    const opportunity = buildOpportunity({
      title: 'Recent OpenAI pricing changes in the last 30 days',
      query: 'recent openai pricing changes last 30 days',
      market: 'global',
      audience: 'product teams',
      problem: 'Need to understand what changed recently',
      outcome: 'Decide whether to update pricing guidance',
      geo: 'global',
      language: 'English'
    });

    expect(opportunity.intakeProfile).toMatchObject({
      intakeKind: 'trend-watch',
      researchMode: 'last30days-brief'
    });
    expect(opportunity.searchIntent).toBe('evaluation');
  });

  it('turns one raw AI procurement question into a pending OpportunitySpec', () => {
    const opportunity = planOpportunityFromQuestion({
      question:
        'For AI coding agents, should my small team buy OpenAI directly or use OpenRouter?',
      geoHint: 'US',
      languageHint: 'English',
      audienceHint: 'small AI teams'
    });

    expect(opportunity.input.query).toContain('OpenRouter');
    expect(opportunity.searchIntent).toBe('comparison');
    expect(opportunity.planning?.approval.status).toBe(
      'pending_user_confirmation'
    );
    expect(opportunity.planning?.roleBriefs.map((item) => item.role)).toContain(
      'opportunity-judge'
    );
  });

  it('blocks compile for raw-question opportunities before user confirmation', async () => {
    const opportunity = planOpportunityFromQuestion({
      question:
        'Should a small AI team buy model APIs directly or through a router?'
    });

    await expect(buildCompilation(opportunity)).rejects.toMatchObject({
      code: 'needs_user_confirmation',
      status: 409
    });
  });

  it('preserves non-ai questions instead of rewriting them into ai procurement', () => {
    const opportunity = planOpportunityFromQuestion({
      question: 'best CRM for dental clinics',
      audienceHint: 'dental clinic owners',
      geoHint: 'US',
      languageHint: 'English'
    });

    expect(opportunity.title.toLowerCase()).toContain('crm');
    expect(opportunity.input.query.toLowerCase()).toContain('crm');
    expect(opportunity.title).not.toContain('AI Coding Teams');
    expect(opportunity.input.query).not.toContain('Direct API');
    expect(opportunity.planning?.intent.caseKey).toBe('general-opportunity');
  });

  it('uses neutral audience defaults for non-ai questions without hints', () => {
    const opportunity = planOpportunityFromQuestion({
      question: 'best CRM for dental clinics'
    });

    expect(opportunity.audience).toBe('general audience');
    expect(opportunity.planning?.intent.audienceCandidates[0]).toBe(
      'general audience'
    );
  });

  it('does not classify generic api questions as ai procurement', () => {
    const opportunity = planOpportunityFromQuestion({
      question: 'best api gateway for fintech',
      geoHint: 'US',
      languageHint: 'English'
    });

    expect(opportunity.title).toBe('Best api gateway for fintech');
    expect(opportunity.input.query).toBe('best api gateway for fintech');
    expect(opportunity.planning?.intent.caseKey).toBe('general-opportunity');
    expect(
      opportunity.planning?.trace.steps[0]?.summary.toLowerCase()
    ).not.toContain('ai procurement');
    expect(
      opportunity.planning?.trace.openQuestions.join(' ').toLowerCase()
    ).not.toContain('pricing');
  });

  it('records planning trace steps and source coverage without turning them into final evidence', () => {
    const opportunity = planOpportunityFromQuestion({
      question:
        'Can OpenRouter beat direct APIs for a small AI coding team in the US?'
    });

    expect(opportunity.planning?.trace.steps.map((item) => item.step)).toEqual(
      expect.arrayContaining([
        'structure_intent',
        'run_demand_analysis',
        'run_competition_analysis',
        'run_monetization_analysis',
        'judge_opportunity'
      ])
    );
    expect(opportunity.planning?.trace.sourceCoverage.length).toBeGreaterThan(0);
    expect(opportunity.planning?.trace.searchRunIds).toEqual([]);
    expect(opportunity).not.toHaveProperty('evidenceSet');
  });
});

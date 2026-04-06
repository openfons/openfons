import { describe, expect, it } from 'vitest';
import { buildOpportunity } from '../../services/control-api/src/compiler.js';
import {
  buildOpportunityIntakeProfile,
  buildPlanningSignalBrief
} from '../../services/control-api/src/planning/signal-brief.js';

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
});

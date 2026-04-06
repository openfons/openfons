import { describe, expect, it } from 'vitest';
import { buildOpportunity } from '../../services/control-api/src/compiler.js';
import {
  classifyAiProcurementOpportunity,
  formatAiProcurementPolicyMessage
} from '../../services/control-api/src/cases/ai-procurement-intake.js';

describe('ai procurement intake policy', () => {
  it('classifies vendor-choice procurement inputs as supported', () => {
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

    expect(classifyAiProcurementOpportunity(opportunity)).toMatchObject({
      supported: true,
      family: 'vendor-choice'
    });
  });

  it('rejects non-ai-procurement inputs with an explicit category', () => {
    const opportunity = buildOpportunity({
      title: 'Best CRM for Dental Clinics',
      query: 'best crm for dental clinics',
      market: 'us',
      audience: 'dental clinic owners',
      problem: 'Need to compare CRM vendors',
      outcome: 'Choose a clinic CRM',
      geo: 'US',
      language: 'English'
    });

    const result = classifyAiProcurementOpportunity(opportunity);
    expect(result).toMatchObject({
      supported: false,
      reason: 'out_of_scope_domain'
    });
    expect(formatAiProcurementPolicyMessage(result)).toContain('AI procurement');
  });

  it('rejects vague AI topics that do not express a buyer decision', () => {
    const opportunity = buildOpportunity({
      title: 'Best AI Models',
      query: 'best ai models',
      market: 'global',
      audience: 'builders',
      problem: 'Need to know what is popular',
      outcome: 'Learn what models exist',
      geo: 'global',
      language: 'English'
    });

    expect(classifyAiProcurementOpportunity(opportunity)).toMatchObject({
      supported: false,
      reason: 'underspecified_buyer_decision'
    });
  });
});

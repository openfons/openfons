import { describe, expect, it } from 'vitest';
import {
  CompilationResultSchema,
  OpportunityInputSchema,
  ReportSpecSchema
} from '@openfons/contracts';

describe('@openfons/contracts', () => {
  it('parses a valid opportunity input', () => {
    const parsed = OpportunityInputSchema.parse({
      title: 'AI Coding Model Procurement Options',
      query: 'best ai coding models',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Teams need to compare price and routing options',
      outcome: 'Produce a minimal report shell'
    });

    expect(parsed.query).toBe('best ai coding models');
  });

  it('rejects an opportunity without a title', () => {
    const result = OpportunityInputSchema.safeParse({
      title: '',
      query: 'best ai coding models',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Teams need to compare price and routing options',
      outcome: 'Produce a minimal report shell'
    });

    expect(result.success).toBe(false);
  });

  it('parses a compilation result', () => {
    const parsed = CompilationResultSchema.parse({
      opportunity: {
        id: 'opp_001',
        slug: 'ai-coding-model-procurement-options',
        title: 'AI Coding Model Procurement Options',
        market: 'global',
        input: {
          title: 'AI Coding Model Procurement Options',
          query: 'best ai coding models',
          market: 'global',
          audience: 'engineering leads',
          problem: 'Teams need to compare price and routing options',
          outcome: 'Produce a minimal report shell'
        },
        status: 'compiled',
        createdAt: '2026-03-27T12:00:00.000Z'
      },
      tasks: [
        {
          id: 'task_001',
          opportunityId: 'opp_001',
          kind: 'collect-evidence',
          status: 'ready'
        },
        {
          id: 'task_002',
          opportunityId: 'opp_001',
          kind: 'score-opportunity',
          status: 'ready'
        },
        {
          id: 'task_003',
          opportunityId: 'opp_001',
          kind: 'render-report',
          status: 'ready'
        }
      ],
      workflow: {
        id: 'wf_001',
        opportunityId: 'opp_001',
        taskIds: ['task_001', 'task_002', 'task_003'],
        status: 'ready'
      },
      report: {
        id: 'report_001',
        opportunityId: 'opp_001',
        title: 'AI Coding Model Procurement Options',
        summary: 'Short summary',
        sections: [
          {
            id: 'sec_001',
            title: 'Why this topic',
            body: 'Demand is rising.'
          }
        ],
        createdAt: '2026-03-27T12:00:00.000Z'
      }
    });

    expect(parsed.report).toMatchObject(
      ReportSpecSchema.parse({
        id: 'report_001',
        opportunityId: 'opp_001',
        title: 'AI Coding Model Procurement Options',
        summary: 'Short summary',
        sections: [
          {
            id: 'sec_001',
            title: 'Why this topic',
            body: 'Demand is rising.'
          }
        ],
        createdAt: '2026-03-27T12:00:00.000Z'
      })
    );
  });
});

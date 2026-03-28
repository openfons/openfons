import { describe, expect, it } from 'vitest';
import {
  CompilationResultSchema,
  OpportunityInputSchema,
  ReportSpecSchema
} from '@openfons/contracts';

function createValidCompilationResult() {
  return {
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
      status: 'compiled' as const,
      createdAt: '2026-03-27T12:00:00.000Z'
    },
    tasks: [
      {
        id: 'task_001',
        opportunityId: 'opp_001',
        kind: 'collect-evidence' as const,
        status: 'ready' as const
      },
      {
        id: 'task_002',
        opportunityId: 'opp_001',
        kind: 'score-opportunity' as const,
        status: 'ready' as const
      },
      {
        id: 'task_003',
        opportunityId: 'opp_001',
        kind: 'render-report' as const,
        status: 'ready' as const
      }
    ],
    workflow: {
      id: 'wf_001',
      opportunityId: 'opp_001',
      taskIds: ['task_001', 'task_002', 'task_003'],
      status: 'ready' as const
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
  };
}

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
    const parsed = CompilationResultSchema.parse(createValidCompilationResult());

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

  it('rejects a compilation result when task opportunity ids do not match the opportunity', () => {
    const input = createValidCompilationResult();
    input.tasks = input.tasks.map((task) => ({
      ...task,
      opportunityId: 'opp_wrong'
    }));

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when workflow opportunity id does not match the opportunity', () => {
    const input = createValidCompilationResult();
    input.workflow.opportunityId = 'opp_wrong';

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when report opportunity id does not match the opportunity', () => {
    const input = createValidCompilationResult();
    input.report.opportunityId = 'opp_wrong';

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when workflow task ids do not match the task list ids', () => {
    const input = createValidCompilationResult();
    input.workflow.taskIds = ['task_001', 'task_002', 'task_999'];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when required task kinds are not unique and complete', () => {
    const input = createValidCompilationResult();
    input.tasks = [
      {
        ...input.tasks[0],
        id: 'task_001',
        kind: 'collect-evidence'
      },
      {
        ...input.tasks[1],
        id: 'task_002',
        kind: 'collect-evidence'
      },
      {
        ...input.tasks[2],
        id: 'task_003',
        kind: 'collect-evidence'
      }
    ];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

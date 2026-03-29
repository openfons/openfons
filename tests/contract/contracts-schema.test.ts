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
      market: 'north-america',
      input: {
        title: 'AI Coding Model Procurement Options',
        query: 'best ai coding models',
        market: 'north-america',
        audience: 'engineering leads',
        problem: 'Teams need to compare price and routing options',
        outcome: 'Produce a decision report shell',
        geo: 'US',
        language: 'English'
      },
      status: 'compiled' as const,
      createdAt: '2026-03-27T12:00:00.000Z',
      audience: 'engineering leads',
      geo: 'US',
      language: 'English',
      searchIntent: 'decision' as const,
      angle: 'Direct API vs router guidance for small AI teams',
      firstDeliverySurface: 'report-web' as const,
      pageCandidates: [
        {
          slug: 'ai-coding-model-procurement-options',
          title: 'AI Coding Model Procurement Options',
          query: 'ai coding model procurement options'
        }
      ],
      evidenceRequirements: [
        {
          kind: 'official-pricing' as const,
          note: 'Capture the official pricing page.'
        },
        {
          kind: 'official-availability' as const,
          note: 'Capture the official regional availability page.'
        }
      ],
      productOpportunityHints: [
        {
          kind: 'tracker' as const,
          note: 'Track provider pricing changes over time.'
        }
      ]
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
      slug: 'direct-api-vs-openrouter-ai-coding',
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      summary: 'Decision report shell',
      audience: 'engineering leads',
      geo: 'US',
      language: 'English',
      thesis: 'Start with a decision report before building a tool.',
      sections: [
        {
          id: 'sec_001',
          title: 'Quick Answer',
          body: 'Start with a report-web decision page.'
        }
      ],
      evidenceBoundaries: ['Capture official pricing and availability sources.'],
      risks: ['Do not publish unsupported cost claims.'],
      updateLog: [
        {
          at: '2026-03-27T12:00:00.000Z',
          note: 'Initial shell created.'
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
      market: 'north-america',
      audience: 'engineering leads',
      problem: 'Teams need to compare price and routing options',
      outcome: 'Produce a decision report shell',
      geo: 'US',
      language: 'English'
    });

    expect(parsed.query).toBe('best ai coding models');
  });

  it('rejects an opportunity without a title', () => {
    const result = OpportunityInputSchema.safeParse({
      title: '',
      query: 'best ai coding models',
      market: 'north-america',
      audience: 'engineering leads',
      problem: 'Teams need to compare price and routing options',
      outcome: 'Produce a decision report shell',
      geo: 'US',
      language: 'English'
    });

    expect(result.success).toBe(false);
  });

  it('parses the richer v1 opportunity and report contracts', () => {
    const parsed = CompilationResultSchema.parse(createValidCompilationResult());

    expect(parsed.opportunity.firstDeliverySurface).toBe('report-web');
    expect(parsed.opportunity.pageCandidates[0].slug).toBe(
      'ai-coding-model-procurement-options'
    );
    expect(parsed.report.thesis).toContain('decision report');
    expect(parsed.report.updateLog[0].note).toBe('Initial shell created.');
    expect(parsed.report).toMatchObject(
      ReportSpecSchema.parse({
        id: 'report_001',
        opportunityId: 'opp_001',
        slug: 'direct-api-vs-openrouter-ai-coding',
        title: 'Direct API vs OpenRouter for AI Coding Teams',
        summary: 'Decision report shell',
        audience: 'engineering leads',
        geo: 'US',
        language: 'English',
        thesis: 'Start with a decision report before building a tool.',
        sections: [
          {
            id: 'sec_001',
            title: 'Quick Answer',
            body: 'Start with a report-web decision page.'
          }
        ],
        evidenceBoundaries: ['Capture official pricing and availability sources.'],
        risks: ['Do not publish unsupported cost claims.'],
        updateLog: [
          {
            at: '2026-03-27T12:00:00.000Z',
            note: 'Initial shell created.'
          }
        ],
        createdAt: '2026-03-27T12:00:00.000Z'
      })
    );
  });

  it('rejects a compilation result when pageCandidates is empty', () => {
    const input = createValidCompilationResult();
    input.opportunity.pageCandidates = [];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when report updateLog is empty', () => {
    const input = createValidCompilationResult();
    input.report.updateLog = [];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
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

  it('rejects a compilation result when task ids contain duplicates', () => {
    const input = createValidCompilationResult();
    input.tasks = [
      { ...input.tasks[0], id: 'task_001' },
      { ...input.tasks[1], id: 'task_002' },
      { ...input.tasks[2], id: 'task_002' }
    ];
    input.workflow.taskIds = ['task_001', 'task_002', 'task_002'];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when workflow task ids contain duplicates', () => {
    const input = createValidCompilationResult();
    input.workflow.taskIds = ['task_001', 'task_002', 'task_002'];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

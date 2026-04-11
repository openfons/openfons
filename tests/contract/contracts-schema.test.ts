import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  CompilationPolicyCodeSchema,
  CompilationResultSchema,
  OpportunityInputSchema,
  OpportunityIntakeProfileSchema,
  PlanningSignalBriefSchema,
  ReportSpecSchema,
  ReportViewSchema
} from '@openfons/contracts';

function createValidCompilationResult() {
  return {
    opportunity: {
      id: 'opp_001',
      slug: 'direct-api-vs-openrouter-ai-coding',
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
      status: 'compiled' as const,
      createdAt: '2026-03-30T08:00:00.000Z',
      audience: 'small ai teams',
      geo: 'global',
      language: 'English',
      searchIntent: 'comparison' as const,
      angle: 'Compare direct provider buying with relay platforms',
      firstDeliverySurface: 'report-web' as const,
      pageCandidates: [
        {
          slug: 'direct-api-vs-openrouter-ai-coding',
          title: 'Direct API vs OpenRouter for AI Coding Teams',
          query: 'direct api vs openrouter'
        }
      ],
      evidenceRequirements: [
        {
          kind: 'official-pricing' as const,
          note: 'Capture official provider and relay pricing pages.'
        }
      ],
      productOpportunityHints: [
        {
          kind: 'tracker' as const,
          note: 'Track provider pricing and routing changes over time.'
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
    topicRun: {
      id: 'run_001',
      opportunityId: 'opp_001',
      workflowId: 'wf_001',
      topicKey: 'ai-procurement',
      status: 'compiled' as const,
      startedAt: '2026-03-30T08:00:00.000Z',
      updatedAt: '2026-03-30T08:10:00.000Z'
    },
    sourceCaptures: [
      {
        id: 'cap_001',
        topicRunId: 'run_001',
        title: 'OpenAI API pricing',
        url: 'https://platform.openai.com/pricing',
        sourceKind: 'official' as const,
        useAs: 'primary' as const,
        reportability: 'reportable' as const,
        riskLevel: 'low' as const,
        captureType: 'pricing-page' as const,
        status: 'captured' as const,
        accessedAt: '2026-03-30T08:00:00.000Z',
        capturedAt: '2026-03-30T08:00:00.000Z',
        language: 'en',
        region: 'global',
        summary: 'Provider pricing page capture'
      }
    ],
    collectionLogs: [
      {
        id: 'log_001',
        topicRunId: 'run_001',
        captureId: 'cap_001',
        step: 'capture' as const,
        status: 'success' as const,
        message: 'Captured official pricing page.',
        createdAt: '2026-03-30T08:00:00.000Z'
      }
    ],
    evidenceSet: {
      id: 'es_001',
      topicRunId: 'run_001',
      createdAt: '2026-03-30T08:05:00.000Z',
      updatedAt: '2026-03-30T08:10:00.000Z',
      items: [
        {
          id: 'evi_001',
          topicRunId: 'run_001',
          captureId: 'cap_001',
          kind: 'pricing' as const,
          statement:
            'Official provider pricing must be the comparison anchor for direct-buy comparisons.',
          sourceKind: 'official' as const,
          useAs: 'primary' as const,
          reportability: 'reportable' as const,
          riskLevel: 'low' as const,
          freshnessNote: 'Verified during the current run.',
          supportingCaptureIds: ['cap_001']
        }
      ]
    },
    report: {
      id: 'report_001',
      opportunityId: 'opp_001',
      slug: 'direct-api-vs-openrouter-ai-coding',
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      summary: 'A source-backed comparison for the first AI procurement run.',
      audience: 'small ai teams',
      geo: 'global',
      language: 'English',
      thesis:
        'Use direct providers when compliance and invoice certainty matter most; use relays when coverage and routing flexibility dominate.',
      claims: [
        {
          id: 'claim_001',
          label: 'Direct purchase anchor',
          statement: 'Direct provider pricing must be the comparison anchor.',
          evidenceIds: ['evi_001']
        }
      ],
      sourceIndex: [
        {
          captureId: 'cap_001',
          title: 'OpenAI API pricing',
          url: 'https://platform.openai.com/pricing',
          sourceKind: 'official' as const,
          useAs: 'primary' as const,
          reportability: 'reportable' as const,
          riskLevel: 'low' as const,
          lastCheckedAt: '2026-03-30T08:00:00.000Z'
        }
      ],
      sections: [
        {
          id: 'sec_001',
          title: 'Quick Answer',
          body:
            'Start from official pricing and availability pages, then layer relay tradeoffs on top.'
        }
      ],
      evidenceBoundaries: [
        'Do not publish pricing claims without an official pricing capture.'
      ],
      risks: [
        'Community complaints can corroborate pain points but cannot define final pricing claims alone.'
      ],
      updateLog: [
        {
          at: '2026-03-30T08:10:00.000Z',
          note: 'Initial AI procurement evidence-backed report compiled.'
        }
      ],
      createdAt: '2026-03-30T08:10:00.000Z',
      updatedAt: '2026-03-30T08:10:00.000Z'
    },
    artifacts: [
      {
        id: 'art_001',
        topicRunId: 'run_001',
        reportId: 'report_001',
        type: 'report' as const,
        storage: 'file' as const,
        uri: 'artifacts/generated/ai-procurement/direct-api-vs-openrouter-ai-coding-report_001/report.html',
        createdAt: '2026-03-30T08:10:00.000Z'
      }
    ]
  };
}

describe('@openfons/contracts', () => {
  it('parses shared compile policy error bodies', () => {
    expect(CompilationPolicyCodeSchema.parse('out_of_scope_domain')).toBe(
      'out_of_scope_domain'
    );

    expect(
      ApiErrorSchema.parse({
        code: 'insufficient_public_evidence',
        message: 'Need at least one official source family before compile.'
      })
    ).toMatchObject({
      code: 'insufficient_public_evidence'
    });
  });

  it('parses a valid opportunity input', () => {
    const parsed = OpportunityInputSchema.parse({
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      query: 'direct api vs openrouter',
      market: 'global',
      audience: 'small ai teams',
      problem: 'Teams need cheaper but reliable model procurement',
      outcome: 'Produce a source-backed report',
      geo: 'global',
      language: 'English'
    });

    expect(parsed.query).toBe('direct api vs openrouter');
  });

  it('parses planning signal brief and intake profile subobjects', () => {
    expect(
      PlanningSignalBriefSchema.parse({
        lookbackDays: 30,
        comparisonMode: true,
        candidateEntities: ['OpenAI', 'OpenRouter'],
        sourceCoverage: [
          {
            sourceId: 'web',
            role: 'required',
            status: 'planned',
            rationale: 'Ground the planning brief with public docs.'
          },
          {
            sourceId: 'reddit',
            role: 'recommended',
            status: 'planned',
            rationale: 'Capture practitioner friction.'
          }
        ],
        signalFamilies: ['search', 'community', 'update'],
        briefGoal:
          'Establish the last-30-days comparison signal around OpenAI vs OpenRouter.'
      })
    ).toMatchObject({
      comparisonMode: true
    });

    expect(
      OpportunityIntakeProfileSchema.parse({
        intakeKind: 'comparison',
        researchMode: 'hybrid',
        primaryDecision: 'Choose the safer procurement path',
        acceptedDelivery: 'report-web',
        notes: ['Use cross-source convergence before compile.']
      })
    ).toMatchObject({
      intakeKind: 'comparison'
    });
  });

  it('rejects an opportunity without a title', () => {
    const result = OpportunityInputSchema.safeParse({
      title: '',
      query: 'direct api vs openrouter',
      market: 'global',
      audience: 'small ai teams',
      problem: 'Teams need cheaper but reliable model procurement',
      outcome: 'Produce a source-backed report',
      geo: 'global',
      language: 'English'
    });

    expect(result.success).toBe(false);
  });

  it('parses the richer v1 opportunity and report contracts', () => {
    const parsed = CompilationResultSchema.parse(createValidCompilationResult());

    expect(parsed.opportunity.firstDeliverySurface).toBe('report-web');
    expect(parsed.opportunity.pageCandidates[0].slug).toBe(
      'direct-api-vs-openrouter-ai-coding'
    );
    expect(parsed.topicRun.topicKey).toBe('ai-procurement');
    expect(parsed.report.thesis).toContain('direct providers');
    expect(parsed.report.updateLog[0].note).toBe(
      'Initial AI procurement evidence-backed report compiled.'
    );
    expect(parsed.report).toMatchObject(
      ReportSpecSchema.parse({
        id: 'report_001',
        opportunityId: 'opp_001',
        slug: 'direct-api-vs-openrouter-ai-coding',
        title: 'Direct API vs OpenRouter for AI Coding Teams',
        summary: 'A source-backed comparison for the first AI procurement run.',
        audience: 'small ai teams',
        geo: 'global',
        language: 'English',
        thesis:
          'Use direct providers when compliance and invoice certainty matter most; use relays when coverage and routing flexibility dominate.',
        claims: [
          {
            id: 'claim_001',
            label: 'Direct purchase anchor',
            statement:
              'Direct provider pricing must be the comparison anchor.',
            evidenceIds: ['evi_001']
          }
        ],
        sourceIndex: [
          {
            captureId: 'cap_001',
            title: 'OpenAI API pricing',
            url: 'https://platform.openai.com/pricing',
            sourceKind: 'official',
            useAs: 'primary',
            reportability: 'reportable',
            riskLevel: 'low',
            lastCheckedAt: '2026-03-30T08:00:00.000Z'
          }
        ],
        sections: [
          {
            id: 'sec_001',
            title: 'Quick Answer',
            body:
              'Start from official pricing and availability pages, then layer relay tradeoffs on top.'
          }
        ],
        evidenceBoundaries: [
          'Do not publish pricing claims without an official pricing capture.'
        ],
        risks: [
          'Community complaints can corroborate pain points but cannot define final pricing claims alone.'
        ],
        updateLog: [
          {
            at: '2026-03-30T08:10:00.000Z',
            note: 'Initial AI procurement evidence-backed report compiled.'
          }
        ],
        createdAt: '2026-03-30T08:10:00.000Z',
        updatedAt: '2026-03-30T08:10:00.000Z'
      })
    );
  });

  it('parses a report view built from the evidence chain', () => {
    const compilation = createValidCompilationResult();
    const parsed = CompilationResultSchema.parse(compilation);
    const view = ReportViewSchema.parse({
      report: parsed.report,
      evidenceSet: parsed.evidenceSet,
      sourceCaptures: parsed.sourceCaptures,
      collectionLogs: parsed.collectionLogs
    });

    expect(view.report.claims[0].evidenceIds).toEqual(['evi_001']);
    expect(view.sourceCaptures[0].sourceKind).toBe('official');
    expect(view.evidenceSet.items[0].statement).toContain('comparison anchor');
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

  it('rejects a compilation result when topic run ids do not align', () => {
    const input = createValidCompilationResult();
    input.topicRun.opportunityId = 'opp_wrong';

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when report claims reference missing evidence', () => {
    const input = createValidCompilationResult();
    input.report.claims[0].evidenceIds = ['evi_missing'];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a compilation result when evidence references a missing capture', () => {
    const input = createValidCompilationResult();
    input.evidenceSet.items[0].supportingCaptureIds = ['cap_missing'];

    const result = CompilationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

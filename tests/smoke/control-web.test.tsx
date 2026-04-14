import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ControlApiError,
  createControlApi
} from '../../apps/control-web/src/api';
import { OpportunityPage } from '../../apps/control-web/src/pages/opportunity-page';

const plannedOpportunity = {
  id: 'opp_001',
  slug: 'direct-api-vs-openrouter',
  title: 'Direct API vs OpenRouter for AI Coding Teams',
  market: 'US',
  input: {
    title: 'Direct API vs OpenRouter for AI Coding Teams',
    query: 'OpenAI Direct API vs OpenRouter',
    market: 'US',
    audience: 'small AI teams',
    problem: 'Teams need to choose between direct model APIs and routing providers.',
    outcome: 'Produce a source-backed comparison report.',
    geo: 'US',
    language: 'English'
  },
  status: 'draft' as const,
  createdAt: '2026-04-14T00:00:00.000Z',
  audience: 'small AI teams',
  geo: 'US',
  language: 'English',
  searchIntent: 'comparison' as const,
  angle: 'official direct purchase versus routing platform tradeoff',
  firstDeliverySurface: 'report-web' as const,
  pageCandidates: [
    {
      slug: 'direct-api-vs-openrouter',
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      query: 'OpenAI Direct API vs OpenRouter'
    }
  ],
  evidenceRequirements: [
    {
      kind: 'official-pricing' as const,
      note: 'Capture official pricing pages.'
    }
  ],
  productOpportunityHints: [],
  planning: {
    question: {
      question:
        'For AI coding agents, should my team buy direct APIs or use OpenRouter?'
    },
    intent: {
      keywordSeed:
        'For AI coding agents, should my team buy direct APIs or use OpenRouter?',
      topic: 'AI coding model procurement',
      caseKey: 'ai-procurement',
      intentCandidates: ['procurement_decision', 'routing_decision', 'comparison'],
      audienceCandidates: ['small AI teams'],
      geoCandidates: ['US'],
      languageCandidates: ['English']
    },
    roleBriefs: [
      {
        role: 'opportunity-judge' as const,
        summary: 'Select OpenAI Direct API vs OpenRouter as the first option.',
        confidence: 'medium' as const,
        keyFindings: ['Buyer intent is clear'],
        openQuestions: ['Validate pricing and routing evidence.'],
        signalFamilies: ['search', 'commercial'] as const
      }
    ],
    options: [
      {
        id: 'option_direct_api_vs_router',
        primaryKeyword: 'OpenAI Direct API vs OpenRouter',
        angle: 'official direct purchase versus routing platform tradeoff',
        audience: 'small AI teams',
        geo: 'US',
        language: 'English',
        searchIntent: 'comparison' as const,
        rationale: 'Bounded procurement decision with clear evidence needs.',
        riskNotes: ['Official pricing must be validated.']
      }
    ],
    recommendedOptionId: 'option_direct_api_vs_router',
    approval: {
      status: 'pending_user_confirmation' as const
    },
    trace: {
      steps: [
        {
          step: 'structure_intent' as const,
          status: 'completed' as const,
          summary: 'Structured raw question into AI procurement intent.'
        },
        {
          step: 'judge_opportunity' as const,
          status: 'completed' as const,
          summary: 'Recommended OpenAI Direct API vs OpenRouter.'
        }
      ],
      sourceCoverage: [],
      searchRunIds: [],
      openQuestions: ['Validate pricing and routing evidence.'],
      contradictions: []
    }
  }
};

const confirmedOpportunity = {
  ...plannedOpportunity,
  planning: {
    ...plannedOpportunity.planning,
    approval: {
      status: 'confirmed' as const,
      selectedOptionId: 'option_direct_api_vs_router',
      confirmedAt: '2026-04-14T00:10:00.000Z'
    }
  }
};

const compiledResult = {
  opportunity: {
    ...confirmedOpportunity,
    status: 'compiled' as const
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
    startedAt: '2026-04-14T00:10:00.000Z',
    updatedAt: '2026-04-14T00:12:00.000Z'
  },
  sourceCaptures: [
    {
      id: 'cap_001',
      topicRunId: 'run_001',
      title: 'OpenAI pricing',
      url: 'https://openai.com/api/pricing/',
      sourceKind: 'official' as const,
      useAs: 'primary' as const,
      reportability: 'reportable' as const,
      riskLevel: 'low' as const,
      captureType: 'pricing-page' as const,
      status: 'captured' as const,
      accessedAt: '2026-04-14T00:11:00.000Z',
      capturedAt: '2026-04-14T00:11:00.000Z',
      language: 'en',
      region: 'US',
      summary: 'Official pricing capture'
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
      createdAt: '2026-04-14T00:11:00.000Z'
    }
  ],
  evidenceSet: {
    id: 'es_001',
    topicRunId: 'run_001',
    createdAt: '2026-04-14T00:11:00.000Z',
    updatedAt: '2026-04-14T00:12:00.000Z',
    items: [
      {
        id: 'evi_001',
        topicRunId: 'run_001',
        captureId: 'cap_001',
        kind: 'pricing' as const,
        statement: 'Official provider pricing was captured.',
        sourceKind: 'official' as const,
        useAs: 'primary' as const,
        reportability: 'reportable' as const,
        riskLevel: 'low' as const,
        freshnessNote: 'Checked during the current run.',
        supportingCaptureIds: ['cap_001']
      }
    ]
  },
  report: {
    id: 'report_001',
    opportunityId: 'opp_001',
    slug: 'direct-api-vs-openrouter',
    title: 'Direct API vs OpenRouter for AI Coding Teams',
    summary: 'A source-backed comparison report shell.',
    audience: 'small AI teams',
    geo: 'US',
    language: 'English',
    thesis: 'Start from official pricing and routing evidence.',
    claims: [
      {
        id: 'claim_001',
        label: 'Pricing anchor',
        statement: 'Official pricing must anchor the comparison.',
        evidenceIds: ['evi_001']
      }
    ],
    sourceIndex: [
      {
        captureId: 'cap_001',
        title: 'OpenAI pricing',
        url: 'https://openai.com/api/pricing/',
        sourceKind: 'official' as const,
        useAs: 'primary' as const,
        reportability: 'reportable' as const,
        riskLevel: 'low' as const,
        lastCheckedAt: '2026-04-14T00:11:00.000Z'
      }
    ],
    sections: [
      {
        id: 'sec_001',
        title: 'Quick Answer',
        body: 'Start with a bounded comparison page.'
      }
    ],
    evidenceBoundaries: ['Capture official pricing before publishing.'],
    risks: ['Do not publish unsupported cost claims.'],
    updateLog: [
      {
        at: '2026-04-14T00:12:00.000Z',
        note: 'Initial shell created.'
      }
    ],
    createdAt: '2026-04-14T00:12:00.000Z',
    updatedAt: '2026-04-14T00:12:00.000Z'
  },
  artifacts: [
    {
      id: 'art_001',
      topicRunId: 'run_001',
      reportId: 'report_001',
      type: 'report' as const,
      storage: 'file' as const,
      uri: 'artifacts/generated/ai-procurement/direct-api-vs-openrouter/report.html',
      createdAt: '2026-04-14T00:12:00.000Z'
    }
  ]
};

describe('control-web', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('plans from a raw question, asks for confirmation, then compiles', async () => {
    const api = {
      planOpportunity: vi.fn(async () => plannedOpportunity),
      confirmOpportunity: vi.fn(async () => confirmedOpportunity),
      createOpportunity: vi.fn(),
      compileOpportunity: vi.fn(async () => compiledResult)
    };

    render(<OpportunityPage api={api} reportBaseUrl="http://localhost:3002" />);

    fireEvent.change(screen.getByLabelText(/question/i), {
      target: {
        value:
          'For AI coding agents, should my team buy direct APIs or use OpenRouter?'
      }
    });
    fireEvent.click(screen.getByRole('button', { name: /plan opportunity/i }));

    expect(
      await screen.findByText(/direct api vs openrouter for ai coding teams/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm and compile/i }));

    expect(api.confirmOpportunity).toHaveBeenCalledWith('opp_001', {
      selectedOptionId: 'option_direct_api_vs_router'
    });
    expect(
      await screen.findByRole('link', { name: /open report shell/i })
    ).toHaveAttribute('href', 'http://localhost:3002/reports/report_001');
    expect(
      screen.queryByRole('button', { name: /confirm and compile/i })
    ).not.toBeInTheDocument();
  });

  it('shows an error message when compilation fails', async () => {
    const api = {
      planOpportunity: vi.fn(async () => plannedOpportunity),
      confirmOpportunity: vi.fn(async () => confirmedOpportunity),
      createOpportunity: vi.fn(),
      compileOpportunity: vi.fn(async () => {
        throw new Error('Failed to compile opportunity');
      })
    };

    render(<OpportunityPage api={api} />);

    fireEvent.change(screen.getByLabelText(/question/i), {
      target: {
        value:
          'For AI coding agents, should my team buy direct APIs or use OpenRouter?'
      }
    });
    fireEvent.click(screen.getByRole('button', { name: /plan opportunity/i }));
    expect(
      await screen.findByText(/direct api vs openrouter for ai coding teams/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm and compile/i }));

    expect(
      await screen.findByText('Failed to compile opportunity')
    ).toBeInTheDocument();
  });

  it('parses structured compile policy errors from control-api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'out_of_scope_domain',
          message:
            'Only bounded AI procurement decisions are supported in the current compile path.'
        }),
        {
          status: 409,
          headers: {
            'content-type': 'application/json'
          }
        }
      )
    );

    const api = createControlApi('http://localhost:3001');

    await expect(api.compileOpportunity('opp_001')).rejects.toMatchObject({
      name: 'ControlApiError',
      code: 'out_of_scope_domain',
      message:
        'Only bounded AI procurement decisions are supported in the current compile path.'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/opportunities/opp_001/compile',
      {
        method: 'POST'
      }
    );
  });

  it('shows supported AI procurement shapes on the page', () => {
    const api = {
      planOpportunity: vi.fn(),
      confirmOpportunity: vi.fn(),
      createOpportunity: vi.fn(),
      compileOpportunity: vi.fn()
    };

    render(<OpportunityPage api={api} />);

    expect(screen.getByText(/vendor choice/i)).toBeInTheDocument();
    expect(screen.getByText(/pricing and access/i)).toBeInTheDocument();
    expect(screen.getByText(/capability procurement/i)).toBeInTheDocument();
  });

  it('shows scoped guidance for policy failures', async () => {
    const api = {
      planOpportunity: vi.fn(async () => plannedOpportunity),
      confirmOpportunity: vi.fn(async () => confirmedOpportunity),
      createOpportunity: vi.fn(),
      compileOpportunity: vi.fn(async () => {
        throw new ControlApiError(
          'Only bounded AI procurement decisions are supported in the current compile path.',
          409,
          'out_of_scope_domain'
        );
      })
    };

    render(<OpportunityPage api={api} />);

    fireEvent.change(screen.getByLabelText(/question/i), {
      target: {
        value:
          'For AI coding agents, should my team buy direct APIs or use OpenRouter?'
      }
    });
    fireEvent.click(screen.getByRole('button', { name: /plan opportunity/i }));
    expect(
      await screen.findByText(/direct api vs openrouter for ai coding teams/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm and compile/i }));

    expect(
      await screen.findByText(
        /try a vendor choice, pricing, or capability access question/i
      )
    ).toBeInTheDocument();
  });
});

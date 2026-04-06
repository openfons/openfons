import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ControlApiError,
  createControlApi
} from '../../apps/control-web/src/api';
import { OpportunityPage } from '../../apps/control-web/src/pages/opportunity-page';

describe('control-web', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('submits an opportunity and shows the generated report link', async () => {
    const api = {
      createOpportunity: async () => ({
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
        status: 'draft' as const,
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
          }
        ],
        productOpportunityHints: [
          {
            kind: 'tracker' as const,
            note: 'Track provider pricing changes over time.'
          }
        ]
      }),
      compileOpportunity: async () => ({
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
          slug: 'ai-coding-model-procurement-options',
          title: 'AI Coding Model Procurement Options',
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
      })
    };

    render(<OpportunityPage api={api} reportBaseUrl="http://localhost:3002" />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'AI Coding Model Procurement Options' }
    });
    fireEvent.change(screen.getByLabelText(/query/i), {
      target: { value: 'best ai coding models' }
    });
    fireEvent.change(screen.getByLabelText(/market/i), {
      target: { value: 'north-america' }
    });
    fireEvent.change(screen.getByLabelText(/audience/i), {
      target: { value: 'engineering leads' }
    });
    fireEvent.change(screen.getByLabelText(/geo/i), {
      target: { value: 'US' }
    });
    fireEvent.change(screen.getByLabelText(/language/i), {
      target: { value: 'English' }
    });
    fireEvent.change(screen.getByLabelText(/problem/i), {
      target: { value: 'Teams need to compare price and routing options' }
    });
    fireEvent.change(screen.getByLabelText(/outcome/i), {
      target: { value: 'Produce a decision report shell' }
    });
    fireEvent.click(screen.getByRole('button', { name: /compile report shell/i }));

    expect(await screen.findByText(/Search intent: decision/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Primary page: ai-coding-model-procurement-options/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Product hints: 1/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open report shell/i })
    ).toHaveAttribute('href', 'http://localhost:3002/reports/report_001');
  });

  it('shows an error message when compilation fails', async () => {
    const api = {
      createOpportunity: async () => ({
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
        status: 'draft' as const,
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
          }
        ],
        productOpportunityHints: [
          {
            kind: 'tracker' as const,
            note: 'Track provider pricing changes over time.'
          }
        ]
      }),
      compileOpportunity: async () => {
        throw new Error('Failed to compile opportunity');
      }
    };

    render(<OpportunityPage api={api} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'AI Coding Model Procurement Options' }
    });
    fireEvent.change(screen.getByLabelText(/query/i), {
      target: { value: 'best ai coding models' }
    });
    fireEvent.change(screen.getByLabelText(/market/i), {
      target: { value: 'north-america' }
    });
    fireEvent.change(screen.getByLabelText(/audience/i), {
      target: { value: 'engineering leads' }
    });
    fireEvent.change(screen.getByLabelText(/geo/i), {
      target: { value: 'US' }
    });
    fireEvent.change(screen.getByLabelText(/language/i), {
      target: { value: 'English' }
    });
    fireEvent.change(screen.getByLabelText(/problem/i), {
      target: { value: 'Teams need to compare price and routing options' }
    });
    fireEvent.change(screen.getByLabelText(/outcome/i), {
      target: { value: 'Produce a decision report shell' }
    });
    fireEvent.click(screen.getByRole('button', { name: /compile report shell/i }));

    expect(await screen.findByText('Failed to compile opportunity')).toBeInTheDocument();
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
      createOpportunity: async () => ({
        id: 'opp_001',
        slug: 'openai-api-vs-openrouter',
        title: 'OpenAI API vs OpenRouter',
        market: 'global',
        input: {
          title: 'OpenAI API vs OpenRouter',
          query: 'openai api vs openrouter',
          market: 'global',
          audience: 'engineering leads',
          problem: 'Need to compare direct provider buying against relay routing',
          outcome: 'Choose the safer procurement path',
          geo: 'global',
          language: 'English'
        },
        status: 'draft' as const,
        createdAt: '2026-04-03T00:00:00.000Z',
        audience: 'engineering leads',
        geo: 'global',
        language: 'English',
        searchIntent: 'decision' as const,
        angle: 'Compare direct provider buying against relay routing',
        firstDeliverySurface: 'report-web' as const,
        pageCandidates: [
          {
            slug: 'openai-api-vs-openrouter',
            title: 'OpenAI API vs OpenRouter',
            query: 'openai api vs openrouter'
          }
        ],
        evidenceRequirements: [
          {
            kind: 'official-pricing' as const,
            note: 'Capture official pricing pages.'
          }
        ],
        productOpportunityHints: []
      }),
      compileOpportunity: async () => {
        throw new ControlApiError(
          'Only bounded AI procurement decisions are supported in the current compile path.',
          409,
          'out_of_scope_domain'
        );
      }
    };

    render(<OpportunityPage api={api} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'OpenAI API vs OpenRouter' }
    });
    fireEvent.change(screen.getByLabelText(/query/i), {
      target: { value: 'openai api vs openrouter' }
    });
    fireEvent.change(screen.getByLabelText(/market/i), {
      target: { value: 'global' }
    });
    fireEvent.change(screen.getByLabelText(/audience/i), {
      target: { value: 'engineering leads' }
    });
    fireEvent.change(screen.getByLabelText(/geo/i), {
      target: { value: 'global' }
    });
    fireEvent.change(screen.getByLabelText(/language/i), {
      target: { value: 'English' }
    });
    fireEvent.change(screen.getByLabelText(/problem/i), {
      target: {
        value: 'Need to compare direct provider buying against relay routing'
      }
    });
    fireEvent.change(screen.getByLabelText(/outcome/i), {
      target: { value: 'Choose the safer procurement path' }
    });
    fireEvent.click(screen.getByRole('button', { name: /compile report shell/i }));

    expect(
      await screen.findByText(
        /try a vendor choice, pricing, or capability access question/i
      )
    ).toBeInTheDocument();
  });
});

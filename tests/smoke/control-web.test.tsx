import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OpportunityPage } from '../../apps/control-web/src/pages/opportunity-page';

describe('control-web', () => {
  afterEach(() => {
    cleanup();
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
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpportunityPage } from '../../apps/control-web/src/pages/opportunity-page';

describe('control-web', () => {
  it('submits an opportunity and shows the generated report link', async () => {
    const api = {
      createOpportunity: async () => ({
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
        status: 'draft' as const,
        createdAt: '2026-03-27T12:00:00.000Z'
      }),
      compileOpportunity: async () => ({
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
          summary: 'Minimal report shell',
          sections: [
            {
              id: 'sec_001',
              title: 'Why this topic now',
              body: 'Demand is rising.'
            }
          ],
          createdAt: '2026-03-27T12:00:00.000Z'
        }
      })
    };

    render(
      <OpportunityPage
        api={api}
        reportBaseUrl="http://localhost:3002"
      />
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'AI Coding Model Procurement Options' }
    });
    fireEvent.change(screen.getByLabelText(/query/i), {
      target: { value: 'best ai coding models' }
    });
    fireEvent.change(screen.getByLabelText(/market/i), {
      target: { value: 'global' }
    });
    fireEvent.change(screen.getByLabelText(/audience/i), {
      target: { value: 'engineering leads' }
    });
    fireEvent.change(screen.getByLabelText(/problem/i), {
      target: { value: 'Teams need to compare price and routing options' }
    });
    fireEvent.change(screen.getByLabelText(/outcome/i), {
      target: { value: 'Produce a minimal report shell' }
    });
    fireEvent.click(screen.getByRole('button', { name: /compile report shell/i }));

    expect(
      await screen.findByRole('link', { name: /open report shell/i })
    ).toHaveAttribute('href', 'http://localhost:3002/reports/report_001');
  });
});
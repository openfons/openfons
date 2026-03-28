import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportPage } from '../../apps/report-web/src/pages/report-page';

describe('report-web', () => {
  it('renders a report loaded from the API', async () => {
    render(
      <ReportPage
        reportId="report_001"
        loadReport={async () => ({
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
        })}
      />
    );

    expect(
      await screen.findByRole('heading', {
        name: 'AI Coding Model Procurement Options'
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Demand is rising.')).toBeInTheDocument();
  });
});

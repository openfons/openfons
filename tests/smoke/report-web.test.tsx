import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReportPage } from '../../apps/report-web/src/pages/report-page';

describe('report-web', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a report loaded from the API', async () => {
    render(
      <ReportPage
        reportId="report_001"
        loadReport={async () => ({
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
        })}
      />
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Direct API vs OpenRouter for AI Coding Teams'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start with a decision report before building a tool.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Capture official pricing and availability sources.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Do not publish unsupported cost claims.')
    ).toBeInTheDocument();
    expect(screen.getByText('Initial shell created.')).toBeInTheDocument();
  });

  it('renders an error when the report request fails', async () => {
    render(
      <ReportPage
        reportId="report_404"
        loadReport={async () => {
          throw new Error('Failed to load report');
        }}
      />
    );

    expect(await screen.findByText('Failed to load report')).toBeInTheDocument();
  });
});

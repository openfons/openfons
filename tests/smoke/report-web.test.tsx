import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReportPage } from '../../apps/report-web/src/pages/report-page';

describe('report-web', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders evidence-backed claims and sources from a report view', async () => {
    render(
      <ReportPage
        reportId="report_001"
        loadReport={async () => ({
          report: {
            id: 'report_001',
            opportunityId: 'opp_001',
            slug: 'direct-api-vs-openrouter-ai-coding',
            title: 'Direct API vs OpenRouter for AI Coding Teams',
            summary: 'A source-backed comparison for the first AI procurement run.',
            audience: 'small ai teams',
            geo: 'global',
            language: 'English',
            thesis: 'Use direct providers when compliance matters most.',
            claims: [
              {
                id: 'claim_001',
                label: 'Official direct-buy baseline',
                statement: 'Direct provider pricing must anchor comparisons.',
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
                body: 'Start from official provider pricing and availability pages.'
              }
            ],
            evidenceBoundaries: [
              'Do not publish pricing claims without official pricing captures.'
            ],
            risks: ['Community pain points do not override official pricing.'],
            updateLog: [
              {
                at: '2026-03-30T08:10:00.000Z',
                note: 'Initial AI procurement evidence-backed report compiled.'
              }
            ],
            createdAt: '2026-03-30T08:10:00.000Z',
            updatedAt: '2026-03-30T08:10:00.000Z'
          },
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
                kind: 'pricing',
                statement: 'Official provider pricing must be the comparison anchor.',
                sourceKind: 'official',
                useAs: 'primary',
                reportability: 'reportable',
                riskLevel: 'low',
                freshnessNote: 'Verified during the current run.',
                supportingCaptureIds: ['cap_001']
              }
            ]
          },
          sourceCaptures: [
            {
              id: 'cap_001',
              topicRunId: 'run_001',
              title: 'OpenAI API pricing',
              url: 'https://platform.openai.com/pricing',
              sourceKind: 'official',
              useAs: 'primary',
              reportability: 'reportable',
              riskLevel: 'low',
              captureType: 'pricing-page',
              status: 'captured',
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
              step: 'capture',
              status: 'success',
              message: 'Captured OpenAI API pricing.',
              createdAt: '2026-03-30T08:00:00.000Z'
            }
          ]
        })}
      />
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Direct API vs OpenRouter for AI Coding Teams'
      })
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Official direct-buy baseline')
    ).toBeInTheDocument();
    expect(screen.getByText('OpenAI API pricing')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Do not publish pricing claims without official pricing captures.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Initial AI procurement evidence-backed report compiled.')
    ).toBeInTheDocument();
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

import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app';

describe('control-api', () => {
  it('creates, compiles, and returns a report shell', async () => {
    const app = createApp();

    const createResponse = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: 'AI Coding Model Procurement Options',
        query: 'best ai coding models',
        market: 'global',
        audience: 'engineering leads',
        problem: 'Teams need to compare price and routing options',
        outcome: 'Produce a minimal report shell'
      })
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.opportunity.status).toBe('draft');

    const compileResponse = await app.request(
      `/api/v1/opportunities/${created.opportunity.id}/compile`,
      {
        method: 'POST'
      }
    );

    expect(compileResponse.status).toBe(200);
    const compiled = await compileResponse.json();
    expect(compiled.opportunity.status).toBe('compiled');
    expect(compiled.workflow.taskIds).toHaveLength(3);
    expect(compiled.report.id).toMatch(/^report_[a-z0-9]{8}$/);

    const reportResponse = await app.request(
      `/api/v1/reports/${compiled.report.id}`
    );

    expect(reportResponse.status).toBe(200);
    const report = await reportResponse.json();
    expect(report.title).toContain('AI Coding Model');
  });
});

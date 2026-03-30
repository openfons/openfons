import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app';

describe('control-api', () => {
  it('compiles an opportunity into a report view backed by evidence', async () => {
    const app = createApp();

    const createResponse = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Direct API vs OpenRouter for AI Coding Teams',
        query: 'direct api vs openrouter',
        market: 'global',
        audience: 'small ai teams',
        problem: 'Teams need cheaper but reliable model procurement',
        outcome: 'Produce a source-backed report',
        geo: 'global',
        language: 'English'
      })
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.opportunity.status).toBe('draft');
    expect(created.opportunity.geo).toBe('global');
    expect(created.opportunity.language).toBe('English');
    expect(created.opportunity.firstDeliverySurface).toBe('report-web');

    const compileResponse = await app.request(
      `/api/v1/opportunities/${created.opportunity.id}/compile`,
      {
        method: 'POST'
      }
    );

    expect(compileResponse.status).toBe(200);
    const compiled = await compileResponse.json();
    expect(compiled.opportunity.status).toBe('compiled');
    expect(compiled.topicRun.topicKey).toBe('ai-procurement');
    expect(compiled.sourceCaptures.length).toBeGreaterThan(0);
    expect(compiled.evidenceSet.items.length).toBeGreaterThan(0);
    expect(compiled.report.claims.length).toBeGreaterThan(0);
    expect(compiled.workflow.taskIds).toHaveLength(3);
    expect(compiled.opportunity.pageCandidates[0].slug).toBe(
      'direct-api-vs-openrouter-for-ai-coding-teams'
    );

    const reportResponse = await app.request(
      `/api/v1/reports/${compiled.report.id}`
    );

    expect(reportResponse.status).toBe(200);
    const reportView = await reportResponse.json();
    expect(reportView.report.id).toBe(compiled.report.id);
    expect(reportView.evidenceSet.id).toBe(compiled.evidenceSet.id);
    expect(reportView.sourceCaptures[0].title).toContain('pricing');
  });

  it('rejects invalid opportunity payloads', async () => {
    const app = createApp();

    const response = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: ''
      })
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain('Required');
  });

  it('returns 404 when compiling an unknown opportunity', async () => {
    const app = createApp();

    const response = await app.request('/api/v1/opportunities/opp_missing/compile', {
      method: 'POST'
    });

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Opportunity not found');
  });

  it('returns 404 for unknown reports', async () => {
    const app = createApp();

    const response = await app.request('/api/v1/reports/report_missing');

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Report not found');
  });

  it('rejects malformed json payloads', async () => {
    const app = createApp();

    const response = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: '{bad json'
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid JSON payload');
  });

  it('rejects titles that cannot produce a slug', async () => {
    const app = createApp();

    const response = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: '!!!',
        query: 'best ai coding models',
        market: 'north-america',
        audience: 'engineering leads',
        problem: 'Teams need to compare price and routing options',
        outcome: 'Produce a decision report shell',
        geo: 'US',
        language: 'English'
      })
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe(
      'Title must contain at least one alphanumeric character'
    );
  });
});

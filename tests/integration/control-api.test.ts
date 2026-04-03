import { describe, expect, it } from 'vitest';
import type {
  Evidence,
  OpportunitySpec,
  SourceCapture,
  WorkflowSpec
} from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createSourceCapture,
  createTopicRun
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';
import { createApp } from '../../services/control-api/src/app';

const createOpportunityInput = () => ({
  title: 'Direct API vs OpenRouter for AI Coding Teams',
  query: 'direct api vs openrouter',
  market: 'global',
  audience: 'small ai teams',
  problem: 'Teams need cheaper but reliable model procurement',
  outcome: 'Produce a source-backed report',
  geo: 'global',
  language: 'English'
});

const createRealBridgeBundle = (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec
) => {
  const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');
  const sourceCaptures: SourceCapture[] = [
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Live OpenAI pricing capture',
      url: 'https://openai.com/api/pricing/',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Live pricing page capture from the bridge.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Live Gemini pricing capture',
      url: 'https://ai.google.dev/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Live Gemini pricing page capture from the bridge.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Live OpenRouter pricing capture',
      url: 'https://openrouter.ai/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Live OpenRouter pricing page capture from the bridge.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Live OpenAI region capture',
      url: 'https://help.openai.com/articles/5347006-openai-api-supported-countries-and-territories',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'availability-page',
      language: 'en',
      region: 'global',
      summary: 'Live OpenAI region support capture from the bridge.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Live relay community corroboration',
      url: 'https://www.reddit.com/r/OpenRouter/comments/1mgz77y/openrouter_model_pricing_misleading/',
      sourceKind: 'community',
      useAs: 'corroboration',
      reportability: 'caveated',
      riskLevel: 'medium',
      captureType: 'community-thread',
      language: 'en',
      region: 'global',
      summary: 'Live community corroboration capture from the bridge.'
    })
  ];
  const evidenceSet = createEvidenceSet(topicRun.id);
  const evidenceItems: Evidence[] = [
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[0].id,
      kind: 'pricing',
      statement: 'Live direct provider pricing was captured.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Checked during the bridge run.',
      supportingCaptureIds: [sourceCaptures[0].id, sourceCaptures[1].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[2].id,
      kind: 'routing',
      statement: 'Live relay pricing caveats were captured.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote: 'Checked during the bridge run.',
      supportingCaptureIds: [sourceCaptures[2].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[4].id,
      kind: 'community',
      statement: 'Live community corroboration was captured.',
      sourceKind: 'community',
      useAs: 'corroboration',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote: 'Checked during the bridge run.',
      supportingCaptureIds: [sourceCaptures[4].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[3].id,
      kind: 'availability',
      statement: 'Live region support was captured.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Checked during the bridge run.',
      supportingCaptureIds: [sourceCaptures[3].id]
    }
  ];

  return {
    topicRun: {
      ...topicRun,
      status: 'compiled' as const,
      updatedAt: nowIso()
    },
    sourceCaptures,
    collectionLogs: [
      createCollectionLog({
        topicRunId: topicRun.id,
        step: 'discover',
        status: 'success',
        message: 'Real collection bridge selected 5 live targets.'
      }),
      ...sourceCaptures.map((capture) =>
        createCollectionLog({
          topicRunId: topicRun.id,
          captureId: capture.id,
          step: 'capture',
          status: 'success',
          message: `Captured ${capture.title} via live bridge`
        })
      )
    ],
    evidenceSet: {
      ...evidenceSet,
      updatedAt: nowIso(),
      items: evidenceItems
    }
  };
};

describe('control-api', () => {
  it('compiles an opportunity into a report view backed by evidence', async () => {
    const app = createApp({
      buildAiProcurementCaseBundle: async (opportunity, workflow) =>
        createRealBridgeBundle(opportunity, workflow)
    });

    const createResponse = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(createOpportunityInput())
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

  it('prefers real collection bridge output when the bridge succeeds', async () => {
    const app = createApp({
      buildAiProcurementCaseBundle: async (opportunity, workflow) =>
        createRealBridgeBundle(opportunity, workflow)
    });

    const createResponse = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(createOpportunityInput())
    });
    const created = await createResponse.json();

    const compileResponse = await app.request(
      `/api/v1/opportunities/${created.opportunity.id}/compile`,
      {
        method: 'POST'
      }
    );

    expect(compileResponse.status).toBe(200);
    const compiled = await compileResponse.json();
    expect(compiled.sourceCaptures[0].title).toBe('Live OpenAI pricing capture');
    expect(
      compiled.collectionLogs.some(
        (log: { message: string }) =>
          log.message === 'Real collection bridge selected 5 live targets.'
      )
    ).toBe(true);
    expect(
      compiled.collectionLogs.some((log: { message: string }) =>
        log.message.includes('deterministic fallback')
      )
    ).toBe(false);
  });

  it('falls back explicitly when the real collection bridge fails', async () => {
    const app = createApp({
      buildAiProcurementCaseBundle: async () => {
        throw Object.assign(new Error('search providers unavailable'), {
          name: 'AiProcurementRuntimeError',
          logs: []
        });
      }
    });

    const createResponse = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(createOpportunityInput())
    });
    const created = await createResponse.json();

    const compileResponse = await app.request(
      `/api/v1/opportunities/${created.opportunity.id}/compile`,
      {
        method: 'POST'
      }
    );

    expect(compileResponse.status).toBe(200);
    const compiled = await compileResponse.json();
    expect(compiled.sourceCaptures[0].title).toBe('OpenAI API pricing');
    expect(
      compiled.collectionLogs.some(
        (log: { step: string; status: string; message: string }) =>
          log.step === 'discover' &&
          log.status === 'warning' &&
          log.message.includes('deterministic fallback')
      )
    ).toBe(true);
    expect(
      compiled.collectionLogs.some((log: { message: string }) =>
        log.message.includes('search providers unavailable')
      )
    ).toBe(true);
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

  it('rejects compile requests for unsupported opportunity topics', async () => {
    const app = createApp();

    const createResponse = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Best CRM for Dental Clinics',
        query: 'best crm for dental clinics',
        market: 'us',
        audience: 'dental clinic owners',
        problem: 'Need to compare CRM options',
        outcome: 'Produce a source-backed report',
        geo: 'US',
        language: 'English'
      })
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();

    const compileResponse = await app.request(
      `/api/v1/opportunities/${created.opportunity.id}/compile`,
      {
        method: 'POST'
      }
    );

    expect(compileResponse.status).toBe(409);
    await expect(compileResponse.text()).resolves.toContain(
      'Direct API vs OpenRouter'
    );
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

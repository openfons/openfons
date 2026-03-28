import { describe, expect, it } from 'vitest';
import { addEvidence, createEvidenceSet } from '@openfons/domain-models';

describe('@openfons/domain-models', () => {
  it('creates an empty evidence set for a topic', () => {
    const evidenceSet = createEvidenceSet('topic_ai_agents');

    expect(evidenceSet.topicId).toBe('topic_ai_agents');
    expect(evidenceSet.items).toEqual([]);
  });

  it('adds evidence immutably', () => {
    const initial = createEvidenceSet('topic_ai_agents');
    const next = addEvidence(initial, {
      id: 'evi_001',
      source: 'search',
      title: 'Best AI coding models',
      url: 'https://example.com/models',
      collectedAt: '2026-03-27T12:00:00.000Z',
      summary: 'Comparison snapshot'
    });

    expect(initial.items).toHaveLength(0);
    expect(next.items).toHaveLength(1);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId, nowIso, slugify } from '@openfons/shared';

describe('@openfons/shared', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('slugify normalizes human-readable titles', () => {
    expect(slugify('AI Coding Model Procurement Options')).toBe(
      'ai-coding-model-procurement-options'
    );
  });

  it('createId prefixes generated ids', () => {
    expect(createId('opp')).toMatch(/^opp_[a-z0-9]{8}$/);
  });

  it('nowIso returns an ISO timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T12:00:00.000Z'));

    expect(nowIso()).toBe('2026-03-27T12:00:00.000Z');
  });
});

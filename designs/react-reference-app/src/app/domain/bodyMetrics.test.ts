import { describe, expect, it } from 'vitest';
import { weightChangeKg } from './bodyMetrics';

describe('weightChangeKg', () => {
  it('is negative when weight dropped', () => {
    const change = weightChangeKg(70, 68.1);

    expect(change).toBeCloseTo(-1.9);
  });

  it('is positive when weight rose', () => {
    const change = weightChangeKg(70, 72.5);

    expect(change).toBeCloseTo(2.5);
  });

  it('is zero when weight is unchanged', () => {
    const change = weightChangeKg(70, 70);

    expect(change).toBe(0);
  });
});

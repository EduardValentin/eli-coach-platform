import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeasurementEntry } from '../domain/journey';
import { recordMeasurements, SIMULATED_LATENCY_MS } from './measurementService';


const ENTRY: MeasurementEntry = {
  id: 'entry-1',
  recordedAt: new Date('2026-10-01T09:29:00.000Z'),
  weightKg: 66.1,
  waistCm: 74,
  photos: { front: { url: 'blob:front' }, back: { url: 'blob:back' } },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

async function recorded(processing: 'works' | 'refuses') {
  const pending = recordMeasurements(ENTRY, processing);
  await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

  return pending;
}

describe('recording measurements', () => {
  it('stores the entry with its photos', async () => {
    // arrange
    const processing = 'works';

    // act
    const result = await recorded(processing);

    // assert
    expect(result).toEqual({
      entry: ENTRY,
      refusedViews: [],
    });
  });

  it('keeps the entry but refuses photos it cannot process', async () => {
    // arrange
    const processing = 'refuses';

    // act
    const result = await recorded(processing);

    // assert
    expect(result).toEqual({
      entry: { ...ENTRY, photos: {} },
      refusedViews: ['front', 'back'],
    });
  });
});

import { describe, expect, it } from 'vitest';
import { DEMO_JOURNEY_CALL_ID } from '../context/ClientJourneyContext';
import {
  sampleDashboardBookings,
  sampleImminentBookings,
  sampleManyBookings,
  sampleTwoLeftTodayBookings,
} from './assessmentCallSamples';

const NOW = new Date(2026, 8, 21, 12, 0, 0);

describe('seeding the demo client into every bookings sample', () => {
  it.each([
    ['sampleImminentBookings', sampleImminentBookings],
    ['sampleTwoLeftTodayBookings', sampleTwoLeftTodayBookings],
    ['sampleDashboardBookings', sampleDashboardBookings],
    ['sampleManyBookings', sampleManyBookings],
  ])('includes a past booking for the demo client in %s', (_, sample) => {
    // act
    const bookings = sample(NOW);
    const demo = bookings.find(
      (booking) => booking.id === DEMO_JOURNEY_CALL_ID,
    );

    // assert
    expect(demo).toBeDefined();
    expect(demo?.firstName).toBe('Jane');
    expect(demo?.lastName).toBe('Doe');
    expect(demo?.visitorEmail).toBe('jane@example.com');
    expect(demo?.startsAt.getTime()).toBeLessThan(NOW.getTime());
  });
});

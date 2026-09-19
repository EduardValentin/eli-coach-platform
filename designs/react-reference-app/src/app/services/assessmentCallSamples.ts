import {
  DEFAULT_COACH_AVAILABILITY,
  type PrototypeBooking,
} from './assessmentCallService';

const HOUR_MS = 60 * 60 * 1000;

function hoursFromNow(now: Date, hours: number): Date {
  return new Date(now.getTime() + hours * HOUR_MS);
}

function atLocalHour(now: Date, dayOffset: number, hour: number): Date {
  const day = new Date(now);
  day.setDate(day.getDate() + dayOffset);
  day.setHours(hour, 0, 0, 0);
  return day;
}

function sampleBooking(
  id: string,
  startsAt: Date,
  visitor: { name: string; email: string; notes: string },
): PrototypeBooking {
  return {
    id,
    startsAt,
    visitorName: visitor.name,
    visitorEmail: visitor.email,
    notes: visitor.notes,
    visitorTimeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
    coachTimeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
    joinPath: `/book/${id}/join`,
  };
}

export function sampleDashboardBookings(now: Date): PrototypeBooking[] {
  return [
    sampleBooking('ac-sample-in-two-hours', hoursFromNow(now, 2), {
      name: 'Maria Ionescu',
      email: 'maria.ionescu@example.com',
      notes:
        'Training three times a week at home.\nComing back from a shoulder injury, so upper body needs care.',
    }),
    sampleBooking('ac-sample-tomorrow', atLocalHour(now, 1, 18), {
      name: 'Ioana Radu',
      email: 'ioana.radu@example.com',
      notes: '',
    }),
    sampleBooking('ac-sample-three-hours-ago', hoursFromNow(now, -3), {
      name: 'Sofia Dinu',
      email: 'sofia.dinu@example.com',
      notes: 'Wants help with nutrition around her cycle.',
    }),
    sampleBooking('ac-sample-yesterday', atLocalHour(now, -1, 18), {
      name: 'Elena Marin',
      email: 'elena.marin@example.com',
      notes: '',
    }),
  ];
}

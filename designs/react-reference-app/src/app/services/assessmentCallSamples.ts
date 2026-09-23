import { subDays } from 'date-fns';
import {
  DEFAULT_COACH_AVAILABILITY,
  type PrototypeBooking,
} from './assessmentCallService';
import { DEMO_JOURNEY_CALL_ID } from '../context/ClientJourneyContext';

const HOUR_MS = 60 * 60 * 1000;

const USUAL_BOOKING_LEAD_DAYS = 3;

function hoursFromNow(now: Date, hours: number): Date {
  return new Date(now.getTime() + hours * HOUR_MS);
}

function atLocalHour(now: Date, dayOffset: number, hour: number): Date {
  const day = new Date(now);
  day.setDate(day.getDate() + dayOffset);
  day.setHours(hour, 0, 0, 0);
  return day;
}

type SampleVisitor = {
  name: string;
  email: string;
  notes: string;
  dateOfBirth?: string;
  gender?: PrototypeBooking['gender'];
  primaryGoal?: PrototypeBooking['primaryGoal'];
  country?: string;
  phone?: string;
};

type SampleCall = SampleVisitor & { bookedDaysAhead?: number };

function sampleBooking(
  id: string,
  startsAt: Date,
  call: SampleCall,
): PrototypeBooking {
  const { bookedDaysAhead = USUAL_BOOKING_LEAD_DAYS, ...visitor } = call;
  const [firstName, ...rest] = visitor.name.split(' ');
  return {
    id,
    startsAt,
    bookedAt: subDays(startsAt, bookedDaysAhead),
    firstName,
    lastName: rest.join(' '),
    visitorEmail: visitor.email,
    dateOfBirth: visitor.dateOfBirth ?? '1993-05-14',
    gender: visitor.gender ?? 'female',
    primaryGoal: visitor.primaryGoal ?? 'build_strength',
    country: visitor.country ?? 'RO',
    phone: visitor.phone ?? null,
    notes: visitor.notes,
    visitorTimeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
    coachTimeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
    joinPath: `/book/${id}/join`,
  };
}

function demoClientBooking(now: Date): PrototypeBooking {
  return sampleBooking(DEMO_JOURNEY_CALL_ID, atLocalHour(now, -7, 17), {
    name: 'Jane Doe',
    email: 'jane@example.com',
    notes: 'Wants a structured plan with someone to keep her accountable.',
    bookedDaysAhead: 2,
  });
}

export function sampleImminentBookings(now: Date): PrototypeBooking[] {
  return [
    sampleBooking('ac-sample-in-two-hours', hoursFromNow(now, 2), {
      name: 'Maria Ionescu',
      email: 'maria.ionescu@example.com',
      notes:
        'Training three times a week at home.\nComing back from a shoulder injury, so upper body needs care.',
      dateOfBirth: '1991-08-23',
      primaryGoal: 'lose_weight',
      phone: '+40712345678',
    }),
    demoClientBooking(now),
  ];
}

export function sampleTwoLeftTodayBookings(now: Date): PrototypeBooking[] {
  return [
    ...sampleImminentBookings(now),
    sampleBooking('ac-sample-later-today', hoursFromNow(now, 3), {
      name: 'Ioana Radu',
      email: 'ioana.radu@example.com',
      notes: '',
    }),
  ];
}

export function sampleDashboardBookings(now: Date): PrototypeBooking[] {
  return [
    ...sampleImminentBookings(now),
    sampleBooking('ac-sample-tomorrow', atLocalHour(now, 1, 18), {
      name: 'Ioana Radu',
      email: 'ioana.radu@example.com',
      notes: '',
      bookedDaysAhead: 1,
    }),
    sampleBooking('ac-sample-in-three-days', atLocalHour(now, 3, 11), {
      name: 'Andreea Pop',
      email: 'andreea.pop@example.com',
      notes: 'Wants to start before the holidays.',
      dateOfBirth: '1998-11-02',
      primaryGoal: 'build_muscle',
      country: 'GB',
      phone: '+447700900123',
      bookedDaysAhead: 10,
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

const MANY_CALL_NAMES = [
  'Maria Ionescu',
  'Ioana Radu',
  'Andreea Pop',
  'Elena Marin',
  'Sofia Dinu',
  'Carmen Lazar',
  'Bianca Stan',
  'Raluca Toma',
  'Daniela Neagu',
  'Alina Barbu',
  'Gabriela Ene',
  'Roxana Muresan',
  'Cristina Vlad',
  'Oana Dumitru',
  'Simona Petrescu',
  'Larisa Anton',
  'Teodora Sava',
  'Mihaela Croitoru',
  'Adriana Nistor',
  'Corina Balan',
  'Georgiana Ilie',
  'Iulia Moldovan',
  'Diana Voicu',
  'Anca Serban',
  'Lavinia Tudor',
  'Patricia Grigore',
  'Alexandra Dobre',
  'Nicoleta Raducu',
  'Stefania Olaru',
  'Monica Ivan',
];

const MANY_CALL_COUNT = MANY_CALL_NAMES.length;

const MANY_CALL_MIDPOINT = MANY_CALL_COUNT / 2;

export function sampleManyBookings(now: Date): PrototypeBooking[] {
  return [
    demoClientBooking(now),
    ...Array.from({ length: MANY_CALL_COUNT }, (_, index) => {
      const dayOffset = index - MANY_CALL_MIDPOINT + 1;
      const name = MANY_CALL_NAMES[index];
      const [firstName] = name.toLowerCase().split(' ');

      return sampleBooking(
        `ac-sample-many-${index}`,
        atLocalHour(now, dayOffset, 9 + (index % 8)),
        {
          name,
          email: `${firstName}.${index + 1}@example.com`,
          notes: index % 3 === 0 ? 'Booked through the public site.' : '',
          bookedDaysAhead: 1 + (index % 5),
        },
      );
    }),
  ];
}

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
  awaitsResponseFrom,
  checkinSlotAt,
  checkinStartsAt,
  checkinStatus,
  checkinTabFor,
  coachingEndsAt,
  holdsCoachTime,
  isComingUp,
  isOpenClientRequest,
  nextUpcomingOfEachSeries,
  programReviewCheckin,
  proposalFor,
  withProposedTime,
  type CheckIn,
  type CheckinClock,
  type CheckinParty,
  type CheckinStatus,
  type CheckinTab,
} from '../domain/checkins';
import {
  remainingCover,
  seriesBounds,
  seriesChangedTo,
  seriesSetUp,
  seriesStoppedAt,
  type CheckinSeries,
  type SeriesBounds,
  type WeeklyRule,
} from '../domain/checkinSeries';
import { accessEndWithoutRefund, workStartDate } from '../domain/coachingSubscription';
import {
  answerCheckinRequest,
  changeCheckinSeries,
  CHECKIN_NOTICE_MINUTES,
  plannedSeriesWeeks,
  previewCheckinSeries,
  proposeCheckinTime,
  requestCheckinTime,
  scheduleCheckinTime,
  listOpenCheckinTimes,
  setUpCheckinSeries,
  stopCheckinSeries,
  withdrawCheckinRequest,
  type CheckinSeriesChangeDecision,
  type CheckinSeriesSetUpDecision,
  type CheckinSeriesStopDecision,
  type SeriesBoundsAnswer,
  type SeriesPreview,
  type SeriesWeek,
  type CheckinProposalDecision,
  type CheckinRequestDecision,
  type CheckinSchedule,
  type CheckinScheduleDecision,
  type CheckinServiceOutcome,
  type CheckinSettlement,
  type PendingRequestAnswer,
} from '../services/checkinService';
import { useAppState } from './AppContext';
import { useAssessmentCalls } from './AssessmentCallContext';
import { useClientJourneys } from './ClientJourneyContext';
import { toISODate } from '../utils/dateFormatters';

export type { CheckIn } from '../domain/checkins';
export type { CheckinSeries } from '../domain/checkinSeries';
export type { SeriesPreview } from '../services/checkinService';

export const DEMO_CLIENT = { id: 'c1', name: 'Jane Doe' } as const;

const LIVE_CHECKIN_ID = 'ck-live';
const OPEN_REQUEST_ID = 'ck-open-request';

type CoachCheckinProposal = {
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  note?: string;
};

export type CheckinClient = { id: string; name: string };

export type NewCheckin = {
  client: CheckinClient;
  startsAt: Date;
  note: string;
};

export type CheckinRequestResult =
  | { status: 'requested'; checkin: CheckIn }
  | { status: Exclude<CheckinRequestDecision, 'requested'> };

export type CheckinScheduleResult =
  | { status: 'scheduled'; checkin: CheckIn }
  | { status: Exclude<CheckinScheduleDecision, 'scheduled'> };

export type NewTimeProposal = {
  checkinId: string;
  party: CheckinParty;
  startsAt: Date;
  note: string;
};

export type CheckinProposalResult =
  | { status: 'proposed'; checkin: CheckIn }
  | { status: Exclude<CheckinProposalDecision, 'proposed'> };

export const WEEKLY_SERIES_SEEDS = ['none', 'active', 'clashes', 'stopped'] as const;
export type WeeklySeriesSeed = (typeof WEEKLY_SERIES_SEEDS)[number];

export type SeriesChoice = { weekday: number; hour: number };

export type SeriesSetUpResult =
  | { status: 'set_up'; series: CheckinSeries }
  | { status: Exclude<CheckinSeriesSetUpDecision, 'set_up'> };

export type SeriesChangeResult =
  | { status: 'changed'; series: CheckinSeries }
  | { status: Exclude<CheckinSeriesChangeDecision, 'changed'> };

export type SeriesStopResult = { status: CheckinSeriesStopDecision };

type RequestSettler = (
  answer: PendingRequestAnswer,
  outcome: CheckinServiceOutcome,
) => Promise<CheckinSettlement>;

interface CheckinContextType {
  checkins: CheckIn[];
  statusOf: (checkin: CheckIn) => CheckinStatus;
  findCheckin: (checkinId: string) => CheckIn | undefined;
  heldCheckinStarts: () => Date[];
  loadOpenTimes: (clientId: string) => Promise<Date[]>;
  requestCheckin: (request: NewCheckin) => Promise<CheckinRequestResult>;
  coachInitiateCheckin: (data: CoachCheckinProposal) => CheckIn;
  scheduleCheckin: (checkin: NewCheckin) => Promise<CheckinScheduleResult>;
  approveCheckin: (checkinId: string) => Promise<CheckinSettlement>;
  declineCheckin: (checkinId: string) => Promise<CheckinSettlement>;
  withdrawCheckinRequest: (checkinId: string) => Promise<CheckinSettlement>;
  cancelCheckin: (checkinId: string) => void;
  proposeNewTime: (proposal: NewTimeProposal) => Promise<CheckinProposalResult>;
  getUpcomingCheckins: (clientId?: string) => CheckIn[];
  getCheckinsInTab: (tab: CheckinTab, party: CheckinParty, clientId?: string) => CheckIn[];
  getCheckinsAwaiting: (party: CheckinParty, clientId?: string) => CheckIn[];
  hasOpenClientRequest: (clientId: string) => boolean;
  getBookedSlots: (date: string) => string[];
  clearPendingCheckins: () => void;
  clearAllCheckins: () => void;
  restoreSeededCheckins: () => void;
  seedManyCheckins: () => void;
  setOpenClientRequest: (open: boolean) => void;
  hasLiveCheckin: boolean;
  setLiveCheckin: (live: boolean) => void;
  seriesFor: (clientId: string) => CheckinSeries | null;
  seriesWeeks: (clientId: string) => CheckIn[];
  previewSeries: (clientId: string, weekday: number | null) => Promise<SeriesPreview>;
  setUpSeries: (client: CheckinClient, choice: SeriesChoice) => Promise<SeriesSetUpResult>;
  changeSeries: (client: CheckinClient, choice: SeriesChoice) => Promise<SeriesChangeResult>;
  stopSeries: (clientId: string) => Promise<SeriesStopResult>;
  weeklySeries: WeeklySeriesSeed;
  setWeeklySeries: (seed: WeeklySeriesSeed) => void;
}

const CheckinContext = createContext<CheckinContextType | undefined>(undefined);

function nextWeekday(dayOfWeek: number, weeksAhead: number): string {
  const d = new Date();
  const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff + weeksAhead * 7);
  return toISODate(d);
}

function daysAgo(days: number): string {
  return toISODate(new Date(Date.now() - 86400000 * days));
}

function createdDaysAgo(days: number): string {
  return new Date(Date.now() - 86400000 * days).toISOString();
}

function newCheckinId(): string {
  return 'ck-' + Math.random().toString(36).substring(2, 8);
}

function newSeriesId(): string {
  return 'series-' + Math.random().toString(36).substring(2, 8);
}

const SEEDED_SERIES_CHOICE: SeriesChoice = { weekday: 3, hour: 18 };
const SEEDED_SERIES_WEEKS = 12;
const SEEDED_CLASH_WEEKS = [0, 2];
const WEEK_MS = 7 * 86400000;

type SeriesWeekCheckin = {
  series: CheckinSeries;
  client: CheckinClient;
  week: SeriesWeek;
};

function seriesWeekCheckin({ series, client, week }: SeriesWeekCheckin): CheckIn {
  return {
    ...checkinSlotAt(week.startsAt),
    id: newCheckinId(),
    clientId: client.id,
    clientName: client.name,
    coachId: 'coach-1',
    kind: 'recurring',
    status: week.clash ? 'clash' : 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: (series.changedAt ?? series.setUpAt).toISOString(),
    rescheduleCount: 0,
    seriesId: series.id,
  };
}

const MOCK_CHECKINS: CheckIn[] = [
  {
    id: 'ck-1',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: nextWeekday(3, 0),
    time: '10:00',
    kind: 'recurring',
    status: 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(5),
    rescheduleCount: 0,
  },
  {
    id: 'ck-11',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: nextWeekday(5, 0),
    time: '12:00',
    kind: 'ad-hoc',
    status: 'approved',
    initiatedBy: 'client',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(3),
    note: 'Want to go over my food log',
    rescheduleCount: 1,
    previousDate: nextWeekday(4, 0),
    previousTime: '11:00',
  },
  {
    id: 'ck-16',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: nextWeekday(4, 1),
    time: '16:00',
    kind: 'ad-hoc',
    status: 'approved',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: createdDaysAgo(6),
    note: 'Can we plan my holiday training?',
    newTimeNote: 'Thursday afternoon suits me better.',
    rescheduleCount: 2,
    previousDate: nextWeekday(2, 1),
    previousTime: '15:00',
  },
  {
    id: 'ck-2',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: nextWeekday(3, 1),
    time: '10:00',
    kind: 'recurring',
    status: 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(5),
    rescheduleCount: 0,
  },
  {
    id: 'ck-10',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: nextWeekday(4, 2),
    time: '14:00',
    kind: 'recurring',
    status: 'pending',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(5),
    rescheduleCount: 1,
    previousDate: nextWeekday(3, 2),
    previousTime: '10:00',
    newTimeNote: 'I am travelling that Wednesday. Could we do Thursday at 2 PM instead?',
  },
  {
    id: 'ck-15',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: nextWeekday(5, 2),
    time: '16:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'coach',
    proposedBy: 'client',
    createdAt: createdDaysAgo(4),
    note: 'Time to look back at your first month',
    newTimeNote: 'I have a work call that morning. Could we meet on Friday afternoon?',
    rescheduleCount: 1,
    previousDate: nextWeekday(5, 2),
    previousTime: '10:00',
  },
  {
    id: 'ck-3',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: nextWeekday(4, 0),
    time: '14:00',
    kind: 'recurring',
    status: 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(3),
    rescheduleCount: 0,
  },
  {
    id: 'ck-4',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: nextWeekday(5, 0),
    time: '11:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    note: 'I have some questions about my macros',
    rescheduleCount: 0,
  },
  {
    id: 'ck-5',
    clientId: 'c3',
    clientName: 'Emma Stone',
    coachId: 'coach-1',
    date: nextWeekday(2, 0),
    time: '15:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    note: 'Knee feels off after lunges, want to check form',
    rescheduleCount: 0,
  },
  {
    id: 'ck-13',
    clientId: 'c3',
    clientName: 'Emma Stone',
    coachId: 'coach-1',
    date: nextWeekday(1, 1),
    time: '09:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(1),
    note: 'Quick look at your first two weeks',
    rescheduleCount: 0,
  },
  {
    id: 'ck-14',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: nextWeekday(2, 1),
    time: '11:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(1),
    note: 'How is the training feeling so far?',
    rescheduleCount: 0,
  },
  {
    id: 'ck-6',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: daysAgo(7),
    time: '10:00',
    kind: 'recurring',
    status: 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(12),
    rescheduleCount: 0,
  },
  {
    id: 'ck-7',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: daysAgo(5),
    time: '14:00',
    kind: 'recurring',
    status: 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: createdDaysAgo(10),
    rescheduleCount: 0,
  },
  {
    id: 'ck-12',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: daysAgo(2),
    time: '15:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: createdDaysAgo(6),
    note: 'Can we talk about my deload week?',
    rescheduleCount: 0,
  },
  {
    id: 'ck-8',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: daysAgo(3),
    time: '16:00',
    kind: 'ad-hoc',
    status: 'cancelled',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: createdDaysAgo(4),
    note: 'Wanted to talk through travel week',
    rescheduleCount: 0,
  },
  {
    id: 'ck-9',
    clientId: 'c3',
    clientName: 'Emma Stone',
    coachId: 'coach-1',
    date: daysAgo(10),
    time: '11:00',
    kind: 'ad-hoc',
    status: 'approved',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: createdDaysAgo(11),
    rescheduleCount: 0,
  },
];

function openRequestSample(): CheckIn {
  return {
    id: OPEN_REQUEST_ID,
    clientId: DEMO_CLIENT.id,
    clientName: DEMO_CLIENT.name,
    coachId: 'coach-1',
    date: nextWeekday(1, 0),
    time: '09:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: new Date().toISOString(),
    note: 'Can we look at my squat form?',
    rescheduleCount: 0,
  };
}

function liveCheckinSample(): CheckIn {
  const now = new Date();
  return {
    id: LIVE_CHECKIN_ID,
    clientId: DEMO_CLIENT.id,
    clientName: DEMO_CLIENT.name,
    coachId: 'coach-1',
    date: toISODate(now),
    time: `${String(now.getHours()).padStart(2, '0')}:00`,
    kind: 'recurring',
    status: 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: now.toISOString(),
    rescheduleCount: 0,
  };
}

const SAMPLE_CLIENTS = [
  { id: 'c1', name: 'Jane Doe' },
  { id: 'c2', name: 'Jessica Alba' },
  { id: 'c3', name: 'Emma Stone' },
  { id: 'c4', name: 'Sarah Jenkins' },
  { id: 'c5', name: 'Mia Thermopolis' },
] as const;

const SAMPLE_NOTES = [
  'Can we go over my macros?',
  'My lower back felt tight after deadlifts',
  'Travelling next week, want to adjust the plan',
  'Questions about my cycle and training load',
  'Can we look at my squat depth?',
];

function manyCheckinsSample(): CheckIn[] {
  const sample: CheckIn[] = [];
  SAMPLE_CLIENTS.forEach((client, clientIndex) => {
    const weeks = client.id === DEMO_CLIENT.id ? 12 : 4;
    for (let week = 0; week < weeks; week += 1) {
      if (week !== 2) sample.push({
        id: `ck-many-${client.id}-recurring-${week}`,
        clientId: client.id,
        clientName: client.name,
        coachId: 'coach-1',
        date: nextWeekday(1 + clientIndex, week),
        time: `${String(9 + clientIndex).padStart(2, '0')}:00`,
        kind: 'recurring',
        status: 'approved',
        initiatedBy: 'coach',
        proposedBy: 'coach',
        createdAt: createdDaysAgo(20),
        rescheduleCount: 0,
      });
      sample.push({
        id: `ck-many-${client.id}-past-${week}`,
        clientId: client.id,
        clientName: client.name,
        coachId: 'coach-1',
        date: daysAgo(7 * (week + 1) - clientIndex),
        time: `${String(9 + clientIndex).padStart(2, '0')}:00`,
        kind: week === 2 ? 'ad-hoc' : 'recurring',
        status: week === 3 ? 'cancelled' : 'approved',
        initiatedBy: week === 2 ? 'client' : 'coach',
        proposedBy: week === 2 ? 'client' : 'coach',
        createdAt: createdDaysAgo(40),
        rescheduleCount: 0,
      });
    }
    const note = SAMPLE_NOTES[clientIndex % SAMPLE_NOTES.length];
    const requestBase = {
      clientId: client.id,
      clientName: client.name,
      coachId: 'coach-1',
      kind: 'ad-hoc' as const,
      status: 'pending' as const,
      rescheduleCount: 0,
    };
    sample.push(
      {
        ...requestBase,
        id: `ck-many-${client.id}-client-request`,
        date: nextWeekday(1 + (clientIndex % 5), 0),
        time: '12:00',
        initiatedBy: 'client',
        proposedBy: 'client',
        createdAt: createdDaysAgo(1),
        note,
      },
      {
        ...requestBase,
        id: `ck-many-${client.id}-coach-request`,
        date: nextWeekday(1 + ((clientIndex + 2) % 5), 1),
        time: '13:00',
        initiatedBy: 'coach',
        proposedBy: 'coach',
        createdAt: createdDaysAgo(2),
      },
      {
        ...requestBase,
        id: `ck-many-${client.id}-new-time`,
        kind: 'recurring',
        date: nextWeekday(1 + ((clientIndex + 1) % 5), 2),
        time: '15:00',
        initiatedBy: 'coach',
        proposedBy: 'client',
        createdAt: createdDaysAgo(3),
        rescheduleCount: 1,
        previousDate: nextWeekday(1 + clientIndex, 2),
        previousTime: `${String(9 + clientIndex).padStart(2, '0')}:00`,
      },
    );
  });
  return sample;
}

export function byStartAscending(a: CheckIn, b: CheckIn): number {
  return checkinStartsAt(a).getTime() - checkinStartsAt(b).getTime();
}

function byNewestFirst(a: CheckIn, b: CheckIn): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function forClient(clientId?: string) {
  return (checkin: CheckIn) => !clientId || checkin.clientId === clientId;
}

function noteOrNothing(note: string): string | undefined {
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function CheckinProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<CheckIn[]>(MOCK_CHECKINS);
  const [takenElsewhere, setTakenElsewhere] = useState<Date[]>([]);
  const [seriesList, setSeriesList] = useState<CheckinSeries[]>([]);
  const { demoJourney, journeys } = useClientJourneys();
  const { settings, bookedStarts } = useAssessmentCalls();
  const { appState } = useAppState();
  const serviceOutcome = appState.checkinService;

  const programReview = useMemo(
    () => programReviewCheckin(demoJourney, DEMO_CLIENT),
    [demoJourney],
  );
  const subscriptionFor = useCallback(
    (clientId: string) =>
      clientId === DEMO_CLIENT.id
        ? demoJourney.subscription
        : journeys[clientId]?.subscription,
    [demoJourney, journeys],
  );
  const coachingEndFor = useCallback(
    (clientId: string) => coachingEndsAt(subscriptionFor(clientId)),
    [subscriptionFor],
  );

  const checkins = useMemo(
    () => (programReview ? [programReview, ...stored] : stored),
    [programReview, stored],
  );

  const clockFor = useCallback(
    (checkin: CheckIn): CheckinClock => ({
      now: new Date(),
      coachingEndsAt: coachingEndFor(checkin.clientId),
    }),
    [coachingEndFor],
  );

  const statusOf = useCallback(
    (checkin: CheckIn) => checkinStatus(checkin, clockFor(checkin)),
    [clockFor],
  );

  const hasOpenClientRequest = useCallback(
    (clientId: string) =>
      checkins.some(
        (c) => c.clientId === clientId && isOpenClientRequest(c, clockFor(c)),
      ),
    [checkins, clockFor],
  );

  const updateCheckin = useCallback(
    (checkinId: string, change: (checkin: CheckIn) => CheckIn) => {
      setStored((prev) =>
        prev.map((c) => (c.id === checkinId ? change(c) : c)),
      );
    },
    [],
  );

  const findCheckin = useCallback(
    (checkinId: string) => checkins.find((c) => c.id === checkinId),
    [checkins],
  );

  const heldCheckinStarts = useCallback(
    () => [
      ...checkins.filter((c) => holdsCoachTime(statusOf(c))).map(checkinStartsAt),
      ...takenElsewhere,
    ],
    [checkins, statusOf, takenElsewhere],
  );

  const scheduleFor = useCallback(
    (clientId: string): CheckinSchedule => ({
      now: new Date(),
      availability: settings,
      callStarts: bookedStarts,
      heldCheckinStarts: heldCheckinStarts(),
      coachingEndsAt: coachingEndFor(clientId),
    }),
    [settings, bookedStarts, heldCheckinStarts, coachingEndFor],
  );

  const loadOpenTimes = useCallback(
    (clientId: string) => listOpenCheckinTimes(scheduleFor(clientId), serviceOutcome),
    [scheduleFor, serviceOutcome],
  );

  const requestCheckin = useCallback(
    async ({
      client,
      startsAt,
      note,
    }: NewCheckin): Promise<CheckinRequestResult> => {
      const decision = await requestCheckinTime(
        {
          startsAt,
          schedule: scheduleFor(client.id),
          waitingRequest: hasOpenClientRequest(client.id),
        },
        serviceOutcome,
      );
      if (decision === 'time_taken') {
        setTakenElsewhere((taken) => [...taken, startsAt]);
      }
      if (decision !== 'requested') return { status: decision };

      const request: CheckIn = {
        ...checkinSlotAt(startsAt),
        id: newCheckinId(),
        clientId: client.id,
        clientName: client.name,
        coachId: 'coach-1',
        kind: 'ad-hoc',
        status: 'pending',
        initiatedBy: 'client',
        proposedBy: 'client',
        createdAt: new Date().toISOString(),
        note: noteOrNothing(note),
        rescheduleCount: 0,
      };
      setStored((prev) => [request, ...prev]);
      return { status: 'requested', checkin: request };
    },
    [scheduleFor, hasOpenClientRequest, serviceOutcome],
  );

  const coachInitiateCheckin = useCallback((data: CoachCheckinProposal): CheckIn => {
    const proposal: CheckIn = {
      ...data,
      id: newCheckinId(),
      coachId: 'coach-1',
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'coach',
      proposedBy: 'coach',
      createdAt: new Date().toISOString(),
      rescheduleCount: 0,
    };
    setStored((prev) => [proposal, ...prev]);
    return proposal;
  }, []);

  const scheduleCheckin = useCallback(
    async ({
      client,
      startsAt,
      note,
    }: NewCheckin): Promise<CheckinScheduleResult> => {
      const decision = await scheduleCheckinTime(
        { startsAt, schedule: scheduleFor(client.id) },
        serviceOutcome,
      );
      if (decision === 'time_taken') {
        setTakenElsewhere((taken) => [...taken, startsAt]);
      }
      if (decision !== 'scheduled') return { status: decision };

      const checkin = coachInitiateCheckin({
        ...checkinSlotAt(startsAt),
        clientId: client.id,
        clientName: client.name,
        note: noteOrNothing(note),
      });
      return { status: 'scheduled', checkin };
    },
    [scheduleFor, serviceOutcome, coachInitiateCheckin],
  );

  const settleRequest = useCallback(
    async (
      checkinId: string,
      settle: RequestSettler,
      change: (checkin: CheckIn) => CheckIn,
    ): Promise<CheckinSettlement> => {
      const checkin = checkins.find((c) => c.id === checkinId);
      const status = checkin ? statusOf(checkin) : 'cancelled';
      const settlement = await settle({ status }, serviceOutcome);
      if (settlement === 'settled') updateCheckin(checkinId, change);
      return settlement;
    },
    [checkins, statusOf, serviceOutcome, updateCheckin],
  );

  const approveCheckin = useCallback(
    (checkinId: string) =>
      settleRequest(checkinId, answerCheckinRequest, (c) => ({
        ...c,
        status: 'approved',
      })),
    [settleRequest],
  );

  const declineCheckin = useCallback(
    (checkinId: string) =>
      settleRequest(checkinId, answerCheckinRequest, (c) => ({
        ...c,
        status: 'cancelled',
      })),
    [settleRequest],
  );

  const withdrawCheckinRequestById = useCallback(
    (checkinId: string) =>
      settleRequest(checkinId, withdrawCheckinRequest, (c) => ({
        ...c,
        status: 'cancelled',
      })),
    [settleRequest],
  );

  const cancelCheckin = useCallback(
    (checkinId: string) => {
      updateCheckin(checkinId, (c) => ({ ...c, status: 'cancelled' }));
    },
    [updateCheckin],
  );

  const proposeNewTime = useCallback(
    async ({ checkinId, party, startsAt, note }: NewTimeProposal): Promise<CheckinProposalResult> => {
      const checkin = checkins.find((c) => c.id === checkinId);
      if (!checkin) return { status: 'not_pending' };

      const proposal = isComingUp(statusOf(checkin)) ? proposalFor(checkin, party) : 'none';
      const decision = await proposeCheckinTime(
        { startsAt, schedule: scheduleFor(checkin.clientId), proposal },
        serviceOutcome,
      );
      if (decision === 'time_taken') {
        setTakenElsewhere((taken) => [...taken, startsAt]);
      }
      if (decision !== 'proposed') return { status: decision };

      const moved = withProposedTime(checkin, {
        slot: checkinSlotAt(startsAt),
        party,
        note: noteOrNothing(note),
      });
      updateCheckin(checkinId, () => moved);
      return { status: 'proposed', checkin: moved };
    },
    [checkins, statusOf, scheduleFor, serviceOutcome, updateCheckin],
  );

  const withStatus = useCallback(
    (wanted: readonly CheckinStatus[], clientId?: string) =>
      checkins.filter(
        (c) => forClient(clientId)(c) && wanted.includes(statusOf(c)),
      ),
    [checkins, statusOf],
  );

  const getUpcomingCheckins = useCallback(
    (clientId?: string) =>
      withStatus(['approved'], clientId).sort(byStartAscending),
    [withStatus],
  );

  const getCheckinsInTab = useCallback(
    (tab: CheckinTab, party: CheckinParty, clientId?: string) => {
      const inTab = checkins.filter(
        (c) => forClient(clientId)(c) && checkinTabFor(statusOf(c), party) === tab,
      );
      if (tab === 'upcoming') return nextUpcomingOfEachSeries(inTab).sort(byStartAscending);
      if (tab === 'requests') return inTab.sort(byNewestFirst);

      return inTab.sort((a, b) => byStartAscending(b, a));
    },
    [checkins, statusOf],
  );

  const getCheckinsAwaiting = useCallback(
    (party: CheckinParty, clientId?: string) =>
      withStatus(['pending', 'clash'], clientId)
        .filter((c) => awaitsResponseFrom(c) === party)
        .sort(byNewestFirst),
    [withStatus],
  );

  const getBookedSlots = useCallback(
    (date: string): string[] =>
      checkins
        .filter((c) => c.date === date && holdsCoachTime(statusOf(c)))
        .map((c) => c.time),
    [checkins, statusOf],
  );

  const clearPendingCheckins = useCallback(() => {
    setStored((prev) => prev.filter((c) => c.status !== 'pending'));
  }, []);

  const clearAllCheckins = useCallback(() => {
    setStored([]);
    setSeriesList([]);
  }, []);

  const restoreSeededCheckins = useCallback(() => {
    setStored(MOCK_CHECKINS);
    setSeriesList([]);
  }, []);

  const seedManyCheckins = useCallback(() => {
    setStored(manyCheckinsSample());
    setSeriesList([]);
  }, []);

  const setOpenClientRequest = useCallback((open: boolean) => {
    setStored((prev) => {
      const withoutRequests = prev.filter(
        (c) =>
          !(
            c.clientId === DEMO_CLIENT.id &&
            c.kind === 'ad-hoc' &&
            c.initiatedBy === 'client' &&
            c.status === 'pending'
          ),
      );
      return open ? [openRequestSample(), ...withoutRequests] : withoutRequests;
    });
  }, []);

  const seriesFor = useCallback(
    (clientId: string) =>
      seriesList.find((series) => series.clientId === clientId && !series.stoppedAt) ?? null,
    [seriesList],
  );

  const comingUpWeeksOf = useCallback(
    (series: CheckinSeries | null) =>
      series
        ? checkins.filter((c) => c.seriesId === series.id && isComingUp(statusOf(c)))
        : [],
    [checkins, statusOf],
  );

  const seriesWeeks = useCallback(
    (clientId: string) => comingUpWeeksOf(seriesFor(clientId)).sort(byStartAscending),
    [comingUpWeeksOf, seriesFor],
  );

  const setUpBoundsFor = useCallback(
    (clientId: string, now: Date): SeriesBoundsAnswer => {
      const subscription = subscriptionFor(clientId);
      if (!subscription) return 'nothing_to_create';

      return seriesBounds({
        now,
        noticeMinutes: CHECKIN_NOTICE_MINUTES,
        programStartsAt: workStartDate(subscription) ?? subscription.purchasedAt,
        paidThrough: accessEndWithoutRefund(subscription, now),
        coachingEndsAt: coachingEndsAt(subscription),
      });
    },
    [subscriptionFor],
  );

  const ruleOf = useCallback(
    (choice: SeriesChoice): WeeklyRule => ({ ...choice, timeZone: settings.timeZone }),
    [settings.timeZone],
  );

  const scheduleBeside = useCallback(
    (clientId: string, series: CheckinSeries | null): CheckinSchedule => {
      const ownWeeks = new Set(comingUpWeeksOf(series).map((c) => c.id));
      const heldElsewhere = checkins.filter(
        (c) => !ownWeeks.has(c.id) && holdsCoachTime(statusOf(c)),
      );

      return {
        ...scheduleFor(clientId),
        heldCheckinStarts: [...heldElsewhere.map(checkinStartsAt), ...takenElsewhere],
      };
    },
    [comingUpWeeksOf, checkins, statusOf, scheduleFor, takenElsewhere],
  );

  const previewSeries = useCallback(
    (clientId: string, weekday: number | null) => {
      const now = new Date();
      const series = seriesFor(clientId);
      const bounds = series
        ? remainingCover(series, { now, noticeMinutes: CHECKIN_NOTICE_MINUTES })
        : setUpBoundsFor(clientId, now);

      return previewCheckinSeries(
        { weekday, schedule: scheduleBeside(clientId, series), bounds },
        serviceOutcome,
      );
    },
    [seriesFor, setUpBoundsFor, scheduleBeside, serviceOutcome],
  );

  const setUpSeries = useCallback(
    async (client: CheckinClient, choice: SeriesChoice): Promise<SeriesSetUpResult> => {
      if (coachingEndFor(client.id)) return { status: 'client_cannot_answer' };

      const now = new Date();
      const rule = ruleOf(choice);
      const bounds = setUpBoundsFor(client.id, now);
      const schedule = scheduleBeside(client.id, null);
      const planned =
        bounds === 'nothing_to_create'
          ? null
          : seriesSetUp({ id: newSeriesId(), clientId: client.id, rule, bounds, at: now });
      const weeks = planned ? plannedSeriesWeeks(rule, { schedule, starts: planned.starts }) : [];
      const decision = await setUpCheckinSeries(
        { rule, schedule, weeks, seriesExists: seriesFor(client.id) !== null },
        serviceOutcome,
      );
      if (decision !== 'set_up') return { status: decision };
      if (!planned) return { status: 'nothing_to_create' };

      const { series } = planned;
      setSeriesList((prev) => [...prev, series]);
      setStored((prev) => [
        ...weeks.map((week) => seriesWeekCheckin({ series, client, week })),
        ...prev,
      ]);
      return { status: 'set_up', series };
    },
    [coachingEndFor, ruleOf, setUpBoundsFor, scheduleBeside, seriesFor, serviceOutcome],
  );

  const cancelWeeksOf = useCallback(
    (series: CheckinSeries) => {
      const cancelled = new Set(comingUpWeeksOf(series).map((c) => c.id));
      return (prev: CheckIn[]) =>
        prev.map((c): CheckIn => (cancelled.has(c.id) ? { ...c, status: 'cancelled' } : c));
    },
    [comingUpWeeksOf],
  );

  const changeSeries = useCallback(
    async (client: CheckinClient, choice: SeriesChoice): Promise<SeriesChangeResult> => {
      if (coachingEndFor(client.id)) return { status: 'client_cannot_answer' };

      const current = seriesFor(client.id);
      if (!current) return { status: 'changed_meanwhile' };

      const rule = ruleOf(choice);
      const schedule = scheduleBeside(client.id, current);
      const changed = seriesChangedTo(current, {
        rule,
        now: new Date(),
        noticeMinutes: CHECKIN_NOTICE_MINUTES,
      });
      const decision = await changeCheckinSeries({ rule, schedule }, serviceOutcome);
      if (decision !== 'changed') return { status: decision };

      const { series } = changed;
      const weeks = plannedSeriesWeeks(rule, { schedule, starts: changed.starts });
      const replaced = cancelWeeksOf(current);
      setSeriesList((prev) => prev.map((s) => (s.id === series.id ? series : s)));
      setStored((prev) => [
        ...weeks.map((week) => seriesWeekCheckin({ series, client, week })),
        ...replaced(prev),
      ]);
      return { status: 'changed', series };
    },
    [coachingEndFor, seriesFor, ruleOf, scheduleBeside, serviceOutcome, cancelWeeksOf],
  );

  const stopSeries = useCallback(
    async (clientId: string): Promise<SeriesStopResult> => {
      const current = seriesFor(clientId);
      if (!current) return { status: 'changed_meanwhile' };

      const decision = await stopCheckinSeries(serviceOutcome);
      if (decision !== 'stopped') return { status: decision };

      const stopped = seriesStoppedAt(current, new Date());
      setSeriesList((prev) => prev.map((s) => (s.id === stopped.id ? stopped : s)));
      setStored(cancelWeeksOf(current));
      return { status: 'stopped' };
    },
    [seriesFor, serviceOutcome, cancelWeeksOf],
  );

  const weeklySeries = useMemo((): WeeklySeriesSeed => {
    const demoSeries = seriesList.filter((series) => series.clientId === DEMO_CLIENT.id);
    const active = demoSeries.find((series) => !series.stoppedAt);
    if (active) {
      const clashes = checkins.some((c) => c.seriesId === active.id && statusOf(c) === 'clash');
      return clashes ? 'clashes' : 'active';
    }

    return demoSeries.length > 0 ? 'stopped' : 'none';
  }, [seriesList, checkins, statusOf]);

  const seededBoundsFor = useCallback(
    (now: Date): SeriesBounds => {
      const bounds = setUpBoundsFor(DEMO_CLIENT.id, now);
      if (bounds !== 'nothing_to_create') return bounds;

      const from = new Date(now.getTime() + CHECKIN_NOTICE_MINUTES * 60000);
      return { from, until: new Date(from.getTime() + SEEDED_SERIES_WEEKS * WEEK_MS) };
    },
    [setUpBoundsFor],
  );

  const setWeeklySeries = useCallback(
    (seed: WeeklySeriesSeed) => {
      const now = new Date();
      const demoSeriesIds = new Set(
        seriesList.filter((series) => series.clientId === DEMO_CLIENT.id).map((series) => series.id),
      );
      const ofDemoSeries = (c: CheckIn) => c.seriesId !== undefined && demoSeriesIds.has(c.seriesId);
      const releasedClashes = new Set(
        stored.filter((c) => ofDemoSeries(c) && c.status === 'clash').map((c) => checkinStartsAt(c).getTime()),
      );
      const otherSeries = seriesList.filter((series) => !demoSeriesIds.has(series.id));
      const otherCheckins = stored.filter((c) => !ofDemoSeries(c));
      const otherTaken = takenElsewhere.filter((start) => !releasedClashes.has(start.getTime()));

      if (seed === 'none') {
        setSeriesList(otherSeries);
        setStored(otherCheckins);
        setTakenElsewhere(otherTaken);
        return;
      }

      const { series, starts } = seriesSetUp({
        id: newSeriesId(),
        clientId: DEMO_CLIENT.id,
        rule: ruleOf(SEEDED_SERIES_CHOICE),
        bounds: seededBoundsFor(now),
        at: now,
      });
      const clashStarts = seed === 'clashes' ? SEEDED_CLASH_WEEKS.map((week) => starts[week]) : [];
      const weeks = starts.map((startsAt) => ({ startsAt, clash: clashStarts.includes(startsAt) }));
      const seeded = weeks.map((week) => seriesWeekCheckin({ series, client: DEMO_CLIENT, week }));
      const stopped = seed === 'stopped';

      setSeriesList([...otherSeries, stopped ? seriesStoppedAt(series, now) : series]);
      setStored([
        ...seeded.map((c): CheckIn => (stopped ? { ...c, status: 'cancelled' } : c)),
        ...otherCheckins,
      ]);
      setTakenElsewhere([...otherTaken, ...clashStarts]);
    },
    [seriesList, stored, takenElsewhere, ruleOf, seededBoundsFor],
  );

  const hasLiveCheckin = stored.some((c) => c.id === LIVE_CHECKIN_ID);

  const setLiveCheckin = useCallback((live: boolean) => {
    setStored((prev) => {
      const withoutLive = prev.filter((c) => c.id !== LIVE_CHECKIN_ID);
      return live ? [liveCheckinSample(), ...withoutLive] : withoutLive;
    });
  }, []);

  return (
    <CheckinContext.Provider
      value={{
        checkins,
        statusOf,
        findCheckin,
        heldCheckinStarts,
        loadOpenTimes,
        requestCheckin,
        coachInitiateCheckin,
        scheduleCheckin,
        approveCheckin,
        declineCheckin,
        withdrawCheckinRequest: withdrawCheckinRequestById,
        cancelCheckin,
        proposeNewTime,
        getUpcomingCheckins,
        getCheckinsInTab,
        getCheckinsAwaiting,
        hasOpenClientRequest,
        getBookedSlots,
        clearPendingCheckins,
        clearAllCheckins,
        restoreSeededCheckins,
        seedManyCheckins,
        setOpenClientRequest,
        hasLiveCheckin,
        setLiveCheckin,
        seriesFor,
        seriesWeeks,
        previewSeries,
        setUpSeries,
        changeSeries,
        stopSeries,
        weeklySeries,
        setWeeklySeries,
      }}
    >
      {children}
    </CheckinContext.Provider>
  );
}

export function useCheckins() {
  const context = useContext(CheckinContext);
  if (!context) throw new Error('useCheckins must be used within a CheckinProvider');
  return context;
}

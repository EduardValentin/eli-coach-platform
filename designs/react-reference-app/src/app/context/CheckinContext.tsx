import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
  awaitsResponseFrom,
  canPropose,
  checkinSlotAt,
  checkinStartsAt,
  checkinStatus,
  coachingEndsAt,
  holdsCoachTime,
  isOpenClientRequest,
  programReviewCheckin,
  type CheckIn,
  type CheckinClock,
  type CheckinParty,
  type CheckinStatus,
} from '../domain/checkins';
import {
  answerCheckinRequest,
  requestCheckinTime,
  listOpenCheckinTimes,
  withdrawCheckinRequest,
  type CheckinRequestDecision,
  type CheckinSchedule,
  type CheckinServiceOutcome,
  type CheckinSettlement,
  type PendingRequestAnswer,
} from '../services/checkinService';
import { useAppState } from './AppContext';
import { useAssessmentCalls } from './AssessmentCallContext';
import { useClientJourneys } from './ClientJourneyContext';
import { toISODate } from '../utils/dateFormatters';

export type { CheckIn } from '../domain/checkins';

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

export type CheckinRequester = { id: string; name: string };

export type NewCheckinRequest = {
  client: CheckinRequester;
  startsAt: Date;
  note: string;
};

export type CheckinRequestResult =
  | { status: 'requested'; checkin: CheckIn }
  | { status: Exclude<CheckinRequestDecision, 'requested'> };

type RequestSettler = (
  answer: PendingRequestAnswer,
  outcome: CheckinServiceOutcome,
) => Promise<CheckinSettlement>;

interface CheckinContextType {
  checkins: CheckIn[];
  statusOf: (checkin: CheckIn) => CheckinStatus;
  findCheckin: (checkinId: string) => CheckIn | undefined;
  heldCheckinStarts: () => Date[];
  loadOpenTimes: () => Promise<Date[]>;
  requestCheckin: (request: NewCheckinRequest) => Promise<CheckinRequestResult>;
  coachInitiateCheckin: (data: CoachCheckinProposal) => CheckIn;
  approveCheckin: (checkinId: string) => Promise<CheckinSettlement>;
  declineCheckin: (checkinId: string) => Promise<CheckinSettlement>;
  withdrawCheckinRequest: (checkinId: string) => Promise<CheckinSettlement>;
  cancelCheckin: (checkinId: string) => void;
  proposeNewTime: (
    checkinId: string,
    slot: { date: string; time: string },
    proposedBy: CheckinParty,
    message?: string,
  ) => boolean;
  getUpcomingCheckins: (clientId?: string) => CheckIn[];
  getPendingCheckins: (clientId?: string) => CheckIn[];
  getPastCheckins: (clientId?: string) => CheckIn[];
  getCheckinsAwaiting: (party: CheckinParty, clientId?: string) => CheckIn[];
  hasOpenClientRequest: (clientId: string) => boolean;
  getBookedSlots: (date: string) => string[];
  clearPendingCheckins: () => void;
  restoreSeededCheckins: () => void;
  seedManyCheckins: () => void;
  setOpenClientRequest: (open: boolean) => void;
  hasLiveCheckin: boolean;
  setLiveCheckin: (live: boolean) => void;
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
    rescheduleMessage: 'I am travelling that Wednesday. Could we do Thursday at 2 PM instead?',
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

function byStartAscending(a: CheckIn, b: CheckIn): number {
  return checkinStartsAt(a).getTime() - checkinStartsAt(b).getTime();
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
  const { demoJourney } = useClientJourneys();
  const { settings, bookedStarts } = useAssessmentCalls();
  const { appState } = useAppState();
  const serviceOutcome = appState.checkinService;

  const programReview = useMemo(
    () => programReviewCheckin(demoJourney, DEMO_CLIENT),
    [demoJourney],
  );
  const demoCoachingEndsAt = coachingEndsAt(demoJourney.subscription);

  const checkins = useMemo(
    () => (programReview ? [programReview, ...stored] : stored),
    [programReview, stored],
  );

  const clockFor = useCallback(
    (checkin: CheckIn): CheckinClock => ({
      now: new Date(),
      coachingEndsAt:
        checkin.clientId === DEMO_CLIENT.id ? demoCoachingEndsAt : undefined,
    }),
    [demoCoachingEndsAt],
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

  const scheduleNow = useCallback(
    (): CheckinSchedule => ({
      now: new Date(),
      availability: settings,
      callStarts: bookedStarts,
      heldCheckinStarts: heldCheckinStarts(),
    }),
    [settings, bookedStarts, heldCheckinStarts],
  );

  const loadOpenTimes = useCallback(
    () => listOpenCheckinTimes(scheduleNow(), serviceOutcome),
    [scheduleNow, serviceOutcome],
  );

  const requestCheckin = useCallback(
    async ({
      client,
      startsAt,
      note,
    }: NewCheckinRequest): Promise<CheckinRequestResult> => {
      const decision = await requestCheckinTime(
        {
          startsAt,
          schedule: scheduleNow(),
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
    [scheduleNow, hasOpenClientRequest, serviceOutcome],
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
        rescheduleMessage: undefined,
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
    (
      checkinId: string,
      slot: { date: string; time: string },
      proposedBy: CheckinParty,
      message?: string,
    ): boolean => {
      const checkin = stored.find((c) => c.id === checkinId);
      if (!checkin || !canPropose(checkin)) return false;

      updateCheckin(checkinId, (c) => ({
        ...c,
        status: 'pending',
        previousDate: c.date,
        previousTime: c.time,
        date: slot.date,
        time: slot.time,
        proposedBy,
        rescheduleCount: c.rescheduleCount + 1,
        rescheduleMessage: message || undefined,
      }));
      return true;
    },
    [stored, updateCheckin],
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

  const getPendingCheckins = useCallback(
    (clientId?: string) =>
      withStatus(['pending'], clientId).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [withStatus],
  );

  const getPastCheckins = useCallback(
    (clientId?: string) =>
      withStatus(['passed', 'cancelled'], clientId).sort(
        (a, b) => byStartAscending(b, a),
      ),
    [withStatus],
  );

  const getCheckinsAwaiting = useCallback(
    (party: CheckinParty, clientId?: string) =>
      getPendingCheckins(clientId).filter(
        (c) => awaitsResponseFrom(c) === party,
      ),
    [getPendingCheckins],
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

  const restoreSeededCheckins = useCallback(() => {
    setStored(MOCK_CHECKINS);
  }, []);

  const seedManyCheckins = useCallback(() => {
    setStored(manyCheckinsSample());
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
        approveCheckin,
        declineCheckin,
        withdrawCheckinRequest: withdrawCheckinRequestById,
        cancelCheckin,
        proposeNewTime,
        getUpcomingCheckins,
        getPendingCheckins,
        getPastCheckins,
        getCheckinsAwaiting,
        hasOpenClientRequest,
        getBookedSlots,
        clearPendingCheckins,
        restoreSeededCheckins,
        seedManyCheckins,
        setOpenClientRequest,
        hasLiveCheckin,
        setLiveCheckin,
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

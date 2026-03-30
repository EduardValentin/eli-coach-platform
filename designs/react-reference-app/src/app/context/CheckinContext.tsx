import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { isUpcoming } from '../utils/dateFormatters';

export type CheckinType = 'ad-hoc' | 'recurring';
export type CheckinStatus = 'pending' | 'confirmed' | 'declined' | 'completed' | 'rescheduling' | 'cancelled';
export type CheckinSource = 'client-request' | 'plan-schedule' | 'coach-request';

export const MAX_RESCHEDULES = 2;

export interface CheckIn {
  id: string;
  clientId: string;
  clientName: string;
  coachId: string;
  date: string;       // ISO date 'YYYY-MM-DD'
  time: string;        // 24h 'HH:MM'
  type: CheckinType;
  status: CheckinStatus;
  source: CheckinSource;
  planId?: string;
  createdAt: string;
  note?: string;
  initiatedBy: 'coach' | 'client';
  proposedBy?: 'coach' | 'client';
  rescheduleCount: number;
  previousDate?: string;
  previousTime?: string;
  rescheduleMessage?: string;
}

interface CheckinContextType {
  checkins: CheckIn[];
  requestCheckin: (data: { clientId: string; clientName: string; date: string; time: string; note?: string }) => CheckIn | null;
  coachInitiateCheckin: (data: { clientId: string; clientName: string; date: string; time: string; note?: string }) => CheckIn;
  approveCheckin: (checkinId: string) => void;
  declineCheckin: (checkinId: string) => void;
  completeCheckin: (checkinId: string) => void;
  rescheduleCheckin: (checkinId: string, newDate: string, newTime: string, proposedBy: 'coach' | 'client', message?: string) => boolean;
  acceptReschedule: (checkinId: string) => void;
  getUpcomingCheckins: (clientId?: string) => CheckIn[];
  getPendingCheckins: (clientId?: string) => CheckIn[];
  getActionableCheckins: (clientId: string, role: 'coach' | 'client') => CheckIn[];
  hasPendingAdHoc: (clientId: string) => boolean;
  getBookedSlots: (date: string) => string[];
  generateRecurringCheckins: (planId: string, clientId: string, clientName: string) => void;
}

const CheckinContext = createContext<CheckinContextType | undefined>(undefined);

// Helper to get upcoming dates
function getNextWeekday(dayOfWeek: number, weeksAhead: number): string {
  const d = new Date();
  const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff + weeksAhead * 7);
  return d.toISOString().split('T')[0];
}

// Mock seed data
const MOCK_CHECKINS: CheckIn[] = [
  {
    id: 'ck-1',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: getNextWeekday(3, 0),
    time: '10:00',
    type: 'recurring',
    status: 'confirmed',
    source: 'plan-schedule',
    planId: 'p1',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    initiatedBy: 'coach',
    rescheduleCount: 0,
  },
  {
    id: 'ck-2',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: getNextWeekday(3, 1),
    time: '10:00',
    type: 'recurring',
    status: 'confirmed',
    source: 'plan-schedule',
    planId: 'p1',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    initiatedBy: 'coach',
    rescheduleCount: 0,
  },
  {
    id: 'ck-3',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: getNextWeekday(4, 0),
    time: '14:00',
    type: 'recurring',
    status: 'confirmed',
    source: 'plan-schedule',
    planId: 'p2',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    initiatedBy: 'coach',
    rescheduleCount: 0,
  },
  {
    id: 'ck-4',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: getNextWeekday(5, 0),
    time: '11:00',
    type: 'ad-hoc',
    status: 'pending',
    source: 'client-request',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    note: 'I have some questions about my macros',
    initiatedBy: 'client',
    proposedBy: 'client',
    rescheduleCount: 0,
  },
  {
    id: 'ck-5',
    clientId: 'c3',
    clientName: 'Emma Stone',
    coachId: 'coach-1',
    date: getNextWeekday(2, 0),
    time: '15:00',
    type: 'ad-hoc',
    status: 'pending',
    source: 'client-request',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    note: 'Knee feels off after lunges, want to check form',
    initiatedBy: 'client',
    proposedBy: 'client',
    rescheduleCount: 0,
  },
  // Rescheduling demo — coach rescheduled a client-initiated check-in
  {
    id: 'ck-10',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: getNextWeekday(4, 0),
    time: '14:00',
    type: 'ad-hoc',
    status: 'rescheduling',
    source: 'client-request',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    note: 'Want to discuss nutrition plan adjustments',
    initiatedBy: 'client',
    proposedBy: 'coach',
    rescheduleCount: 1,
    previousDate: getNextWeekday(3, 0),
    previousTime: '11:00',
    rescheduleMessage: 'That slot is taken — how about Thursday at 2 PM instead?',
  },
  // Past — completed
  {
    id: 'ck-6',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
    time: '10:00',
    type: 'recurring',
    status: 'completed',
    source: 'plan-schedule',
    planId: 'p1',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    initiatedBy: 'coach',
    rescheduleCount: 0,
  },
  {
    id: 'ck-7',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
    time: '14:00',
    type: 'recurring',
    status: 'completed',
    source: 'plan-schedule',
    planId: 'p2',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    initiatedBy: 'coach',
    rescheduleCount: 0,
  },
  {
    id: 'ck-8',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    time: '16:00',
    type: 'ad-hoc',
    status: 'declined',
    source: 'client-request',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    note: 'Wanted to reschedule — coach was unavailable',
    initiatedBy: 'client',
    proposedBy: 'client',
    rescheduleCount: 0,
  },
  {
    id: 'ck-9',
    clientId: 'c3',
    clientName: 'Emma Stone',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0],
    time: '11:00',
    type: 'ad-hoc',
    status: 'completed',
    source: 'client-request',
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
    initiatedBy: 'client',
    proposedBy: 'client',
    rescheduleCount: 0,
  },
];

export function CheckinProvider({ children }: { children: ReactNode }) {
  const [checkins, setCheckins] = useState<CheckIn[]>(MOCK_CHECKINS);

  const hasPendingAdHoc = useCallback(
    (clientId: string) => checkins.some(
      c => c.clientId === clientId && c.type === 'ad-hoc' && (c.status === 'pending' || c.status === 'rescheduling')
    ),
    [checkins]
  );

  const requestCheckin = useCallback(
    (data: { clientId: string; clientName: string; date: string; time: string; note?: string }): CheckIn | null => {
      if (hasPendingAdHoc(data.clientId)) return null;
      const newCheckin: CheckIn = {
        id: 'ck-' + Math.random().toString(36).substring(2, 8),
        clientId: data.clientId,
        clientName: data.clientName,
        coachId: 'coach-1',
        date: data.date,
        time: data.time,
        type: 'ad-hoc',
        status: 'pending',
        source: 'client-request',
        createdAt: new Date().toISOString(),
        note: data.note,
        initiatedBy: 'client',
        proposedBy: 'client',
        rescheduleCount: 0,
      };
      setCheckins(prev => [newCheckin, ...prev]);
      return newCheckin;
    },
    [hasPendingAdHoc]
  );

  const coachInitiateCheckin = useCallback(
    (data: { clientId: string; clientName: string; date: string; time: string; note?: string }): CheckIn => {
      const newCheckin: CheckIn = {
        id: 'ck-' + Math.random().toString(36).substring(2, 8),
        clientId: data.clientId,
        clientName: data.clientName,
        coachId: 'coach-1',
        date: data.date,
        time: data.time,
        type: 'ad-hoc',
        status: 'pending',
        source: 'coach-request',
        createdAt: new Date().toISOString(),
        note: data.note,
        initiatedBy: 'coach',
        proposedBy: 'coach',
        rescheduleCount: 0,
      };
      setCheckins(prev => [newCheckin, ...prev]);
      return newCheckin;
    },
    []
  );

  const approveCheckin = useCallback((checkinId: string) => {
    setCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, status: 'confirmed' as CheckinStatus } : c));
  }, []);

  const declineCheckin = useCallback((checkinId: string) => {
    setCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, status: 'cancelled' as CheckinStatus } : c));
  }, []);

  const completeCheckin = useCallback((checkinId: string) => {
    setCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, status: 'completed' as CheckinStatus } : c));
  }, []);

  const rescheduleCheckin = useCallback(
    (checkinId: string, newDate: string, newTime: string, proposedBy: 'coach' | 'client', message?: string): boolean => {
      const checkin = checkins.find(c => c.id === checkinId);
      if (!checkin || checkin.rescheduleCount >= MAX_RESCHEDULES) return false;

      setCheckins(prev => prev.map(c =>
        c.id === checkinId
          ? {
              ...c,
              status: 'rescheduling' as CheckinStatus,
              previousDate: c.date,
              previousTime: c.time,
              date: newDate,
              time: newTime,
              proposedBy,
              rescheduleCount: c.rescheduleCount + 1,
              rescheduleMessage: message || undefined,
            }
          : c
      ));
      return true;
    },
    [checkins]
  );

  const acceptReschedule = useCallback((checkinId: string) => {
    setCheckins(prev => prev.map(c =>
      c.id === checkinId
        ? {
            ...c,
            status: 'confirmed' as CheckinStatus,
            previousDate: undefined,
            previousTime: undefined,
            rescheduleMessage: undefined,
          }
        : c
    ));
  }, []);

  const getUpcomingCheckins = useCallback(
    (clientId?: string) =>
      checkins
        .filter(c => c.status === 'confirmed' && isUpcoming(c.date) && (!clientId || c.clientId === clientId))
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [checkins]
  );

  const getPendingCheckins = useCallback(
    (clientId?: string) =>
      checkins
        .filter(c => (c.status === 'pending' || c.status === 'rescheduling') && (!clientId || c.clientId === clientId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [checkins]
  );

  const getActionableCheckins = useCallback(
    (clientId: string, role: 'coach' | 'client') =>
      checkins.filter(c => {
        if (c.clientId !== clientId) return false;
        const counterparty = role === 'coach' ? 'client' : 'coach';
        if (c.status === 'pending' && c.proposedBy === counterparty) return true;
        if (c.status === 'rescheduling' && c.proposedBy === counterparty) return true;
        return false;
      }),
    [checkins]
  );

  const getBookedSlots = useCallback(
    (date: string): string[] =>
      checkins
        .filter(c => c.date === date && c.status === 'confirmed')
        .map(c => c.time),
    [checkins]
  );

  const generateRecurringCheckins = useCallback(
    (planId: string, clientId: string, clientName: string) => {
      const newCheckins: CheckIn[] = [];
      for (let week = 0; week < 4; week++) {
        newCheckins.push({
          id: 'ck-' + Math.random().toString(36).substring(2, 8),
          clientId,
          clientName,
          coachId: 'coach-1',
          date: getNextWeekday(3, week),
          time: '10:00',
          type: 'recurring',
          status: 'confirmed',
          source: 'plan-schedule',
          planId,
          createdAt: new Date().toISOString(),
          initiatedBy: 'coach',
          rescheduleCount: 0,
        });
      }
      setCheckins(prev => [...newCheckins, ...prev]);
    },
    []
  );

  return (
    <CheckinContext.Provider
      value={{
        checkins,
        requestCheckin,
        coachInitiateCheckin,
        approveCheckin,
        declineCheckin,
        completeCheckin,
        rescheduleCheckin,
        acceptReschedule,
        getUpcomingCheckins,
        getPendingCheckins,
        getActionableCheckins,
        hasPendingAdHoc,
        getBookedSlots,
        generateRecurringCheckins,
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

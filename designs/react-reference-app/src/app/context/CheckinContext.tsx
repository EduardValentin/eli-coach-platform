import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { isUpcoming } from '../utils/dateFormatters';

export type CheckinType = 'ad-hoc' | 'recurring';
export type CheckinStatus = 'pending' | 'confirmed' | 'declined' | 'completed';
export type CheckinSource = 'client-request' | 'plan-schedule';

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
}

interface CheckinContextType {
  checkins: CheckIn[];
  requestCheckin: (data: { clientId: string; clientName: string; date: string; time: string; note?: string }) => CheckIn | null;
  approveCheckin: (checkinId: string) => void;
  declineCheckin: (checkinId: string) => void;
  completeCheckin: (checkinId: string) => void;
  getUpcomingCheckins: (clientId?: string) => CheckIn[];
  getPendingCheckins: (clientId?: string) => CheckIn[];
  hasPendingAdHoc: (clientId: string) => boolean;
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
    date: getNextWeekday(3, 0), // Next Wednesday
    time: '10:00',
    type: 'recurring',
    status: 'confirmed',
    source: 'plan-schedule',
    planId: 'p1',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'ck-2',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: getNextWeekday(3, 1), // Wednesday after next
    time: '10:00',
    type: 'recurring',
    status: 'confirmed',
    source: 'plan-schedule',
    planId: 'p1',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'ck-3',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: getNextWeekday(4, 0), // Next Thursday
    time: '14:00',
    type: 'recurring',
    status: 'confirmed',
    source: 'plan-schedule',
    planId: 'p2',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'ck-4',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: getNextWeekday(5, 0), // Next Friday
    time: '11:00',
    type: 'ad-hoc',
    status: 'pending',
    source: 'client-request',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    note: 'I have some questions about my macros',
  },
  // Additional pending
  {
    id: 'ck-5',
    clientId: 'c3',
    clientName: 'Emma Stone',
    coachId: 'coach-1',
    date: getNextWeekday(2, 0), // Next Tuesday
    time: '15:00',
    type: 'ad-hoc',
    status: 'pending',
    source: 'client-request',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    note: 'Knee feels off after lunges, want to check form',
  },
  // Past — completed
  {
    id: 'ck-6',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0], // 1 week ago
    time: '10:00',
    type: 'recurring',
    status: 'completed',
    source: 'plan-schedule',
    planId: 'p1',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'ck-7',
    clientId: 'c2',
    clientName: 'Jessica Alba',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], // 5 days ago
    time: '14:00',
    type: 'recurring',
    status: 'completed',
    source: 'plan-schedule',
    planId: 'p2',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'ck-8',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], // 3 days ago
    time: '16:00',
    type: 'ad-hoc',
    status: 'declined',
    source: 'client-request',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    note: 'Wanted to reschedule — coach was unavailable',
  },
  {
    id: 'ck-9',
    clientId: 'c3',
    clientName: 'Emma Stone',
    coachId: 'coach-1',
    date: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0], // 10 days ago
    time: '11:00',
    type: 'ad-hoc',
    status: 'completed',
    source: 'client-request',
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
  },
];

export function CheckinProvider({ children }: { children: ReactNode }) {
  const [checkins, setCheckins] = useState<CheckIn[]>(MOCK_CHECKINS);

  const hasPendingAdHoc = useCallback(
    (clientId: string) => checkins.some(c => c.clientId === clientId && c.type === 'ad-hoc' && c.status === 'pending'),
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
      };
      setCheckins(prev => [newCheckin, ...prev]);
      return newCheckin;
    },
    [hasPendingAdHoc]
  );

  const approveCheckin = useCallback((checkinId: string) => {
    setCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, status: 'confirmed' as CheckinStatus } : c));
  }, []);

  const declineCheckin = useCallback((checkinId: string) => {
    setCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, status: 'declined' as CheckinStatus } : c));
  }, []);

  const completeCheckin = useCallback((checkinId: string) => {
    setCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, status: 'completed' as CheckinStatus } : c));
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
        .filter(c => c.status === 'pending' && (!clientId || c.clientId === clientId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
          date: getNextWeekday(3, week), // Wednesdays
          time: '10:00',
          type: 'recurring',
          status: 'confirmed',
          source: 'plan-schedule',
          planId,
          createdAt: new Date().toISOString(),
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
        approveCheckin,
        declineCheckin,
        completeCheckin,
        getUpcomingCheckins,
        getPendingCheckins,
        hasPendingAdHoc,
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

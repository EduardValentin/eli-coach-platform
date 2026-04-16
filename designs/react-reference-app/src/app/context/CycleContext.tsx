import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// ── Types ───────────────────────────────────────────────────────────

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export type FlowIntensity = 'light' | 'medium' | 'heavy' | 'spotting';

export type CycleSymptom =
  | 'cramps' | 'bloating' | 'headache' | 'fatigue'
  | 'mood-swings' | 'back-pain' | 'breast-tenderness'
  | 'nausea' | 'acne' | 'insomnia';

export type CycleRegularity = 'regular' | 'irregular';

export interface PeriodLogEntry {
  id: string;
  date: string;
  flow: FlowIntensity;
  symptoms: CycleSymptom[];
  notes?: string;
}

export interface PeriodRecord {
  id: string;
  clientId: string;
  startDate: string;
  endDate?: string;
  entries: PeriodLogEntry[];
}

export interface MenstrualProfile {
  regularity: CycleRegularity;
  averageCycleLength: number;
  averagePeriodLength: number;
  conditions: string[];
  notes: string;
}

export interface PhaseInfo {
  phase: CyclePhase;
  dayInCycle: number;
  phaseName: string;
  phaseColor: string;
}

export const CYCLE_SYMPTOMS: { value: CycleSymptom; label: string }[] = [
  { value: 'cramps', label: 'Cramps' },
  { value: 'bloating', label: 'Bloating' },
  { value: 'headache', label: 'Headache' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'mood-swings', label: 'Mood Swings' },
  { value: 'back-pain', label: 'Back Pain' },
  { value: 'breast-tenderness', label: 'Breast Tenderness' },
  { value: 'nausea', label: 'Nausea' },
  { value: 'acne', label: 'Acne' },
  { value: 'insomnia', label: 'Insomnia' },
];

export const CYCLE_CONDITIONS = [
  'PCOS',
  'Endometriosis',
  'PMDD',
  'Heavy periods',
  'Amenorrhea',
  'Fibroids',
];

// ── Phase config (matches CycleSyncing.tsx marketing ranges) ────────

const PHASE_CONFIG: { phase: CyclePhase; name: string; color: string; start: number; end: number }[] = [
  { phase: 'menstrual',  name: 'Menstrual',  color: '#FF4D6D', start: 1,  end: 5  },
  { phase: 'follicular', name: 'Follicular', color: '#4A90E2', start: 6,  end: 13 },
  { phase: 'ovulatory',  name: 'Ovulatory',  color: '#F5A623', start: 14, end: 16 },
  { phase: 'luteal',     name: 'Luteal',     color: '#BD10E0', start: 17, end: 28 },
];

function getPhaseForDay(dayInCycle: number): Omit<PhaseInfo, 'dayInCycle'> {
  const clamped = ((dayInCycle - 1) % 28) + 1;
  const cfg = PHASE_CONFIG.find(p => clamped >= p.start && clamped <= p.end) ?? PHASE_CONFIG[3];
  return { phase: cfg.phase, phaseName: cfg.name, phaseColor: cfg.color };
}

// ── Helpers ─────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const msA = new Date(a + 'T00:00:00').getTime();
  const msB = new Date(b + 'T00:00:00').getTime();
  return Math.round((msB - msA) / 86_400_000);
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

let idCounter = 100;
function genId(prefix: string) { return `${prefix}-${++idCounter}`; }

// ── Mock data ───────────────────────────────────────────────────────

function buildMockRecords(): PeriodRecord[] {
  return [
    {
      id: 'pr-1', clientId: 'client-1', startDate: daysAgo(21), endDate: daysAgo(17),
      entries: [
        { id: 'ple-1', date: daysAgo(21), flow: 'medium', symptoms: ['cramps', 'fatigue'] },
        { id: 'ple-2', date: daysAgo(20), flow: 'heavy', symptoms: ['cramps', 'bloating'] },
        { id: 'ple-3', date: daysAgo(19), flow: 'heavy', symptoms: ['cramps'] },
        { id: 'ple-4', date: daysAgo(18), flow: 'medium', symptoms: ['fatigue'] },
        { id: 'ple-5', date: daysAgo(17), flow: 'light', symptoms: [] },
      ],
    },
    {
      id: 'pr-2', clientId: 'client-1', startDate: daysAgo(49), endDate: daysAgo(45),
      entries: [
        { id: 'ple-6', date: daysAgo(49), flow: 'medium', symptoms: ['cramps'] },
        { id: 'ple-7', date: daysAgo(48), flow: 'heavy', symptoms: ['bloating', 'fatigue'] },
        { id: 'ple-8', date: daysAgo(47), flow: 'heavy', symptoms: ['cramps', 'headache'] },
        { id: 'ple-9', date: daysAgo(46), flow: 'medium', symptoms: ['back-pain'] },
        { id: 'ple-10', date: daysAgo(45), flow: 'light', symptoms: [] },
      ],
    },
    {
      id: 'pr-3', clientId: 'client-1', startDate: daysAgo(77), endDate: daysAgo(73),
      entries: [
        { id: 'ple-11', date: daysAgo(77), flow: 'light', symptoms: ['fatigue'] },
        { id: 'ple-12', date: daysAgo(76), flow: 'medium', symptoms: ['cramps', 'bloating'] },
        { id: 'ple-13', date: daysAgo(75), flow: 'heavy', symptoms: ['cramps'] },
        { id: 'ple-14', date: daysAgo(74), flow: 'medium', symptoms: [] },
        { id: 'ple-15', date: daysAgo(73), flow: 'light', symptoms: [] },
      ],
    },
    {
      id: 'pr-jb-1', clientId: 'c2', startDate: daysAgo(15), endDate: daysAgo(9),
      entries: [
        { id: 'ple-jb-1', date: daysAgo(15), flow: 'medium', symptoms: ['cramps', 'bloating'] },
        { id: 'ple-jb-2', date: daysAgo(14), flow: 'heavy', symptoms: ['cramps', 'mood-swings'] },
        { id: 'ple-jb-3', date: daysAgo(13), flow: 'heavy', symptoms: ['fatigue', 'back-pain'] },
        { id: 'ple-jb-4', date: daysAgo(12), flow: 'heavy', symptoms: ['cramps'] },
        { id: 'ple-jb-5', date: daysAgo(11), flow: 'medium', symptoms: ['bloating'] },
        { id: 'ple-jb-6', date: daysAgo(10), flow: 'light', symptoms: [] },
        { id: 'ple-jb-7', date: daysAgo(9),  flow: 'spotting', symptoms: [] },
      ],
    },
    {
      id: 'pr-jb-2', clientId: 'c2', startDate: daysAgo(50), endDate: daysAgo(44),
      entries: [
        { id: 'ple-jb-8',  date: daysAgo(50), flow: 'medium',  symptoms: ['cramps'] },
        { id: 'ple-jb-9',  date: daysAgo(49), flow: 'heavy',   symptoms: ['mood-swings', 'bloating'] },
        { id: 'ple-jb-10', date: daysAgo(48), flow: 'heavy',   symptoms: ['fatigue'] },
        { id: 'ple-jb-11', date: daysAgo(47), flow: 'medium',  symptoms: ['back-pain'] },
        { id: 'ple-jb-12', date: daysAgo(46), flow: 'medium',  symptoms: [] },
        { id: 'ple-jb-13', date: daysAgo(45), flow: 'light',   symptoms: [] },
        { id: 'ple-jb-14', date: daysAgo(44), flow: 'spotting', symptoms: [] },
      ],
    },
  ];
}

const MOCK_PROFILES: Record<string, MenstrualProfile> = {
  'client-1': {
    regularity: 'regular',
    averageCycleLength: 28,
    averagePeriodLength: 5,
    conditions: [],
    notes: '',
  },
  'c2': {
    regularity: 'irregular',
    averageCycleLength: 35,
    averagePeriodLength: 7,
    conditions: ['PCOS'],
    notes: 'Periods can vary by up to a week. Sometimes skips months.',
  },
};

// ── Context shape ───────────────────────────────────────────────────

interface CycleContextType {
  periodRecords: PeriodRecord[];
  menstrualProfiles: Record<string, MenstrualProfile>;

  logPeriodDay(clientId: string, date: string, flow: FlowIntensity, symptoms: CycleSymptom[], notes?: string): void;
  removePeriodLog(entryId: string): void;
  setMenstrualProfile(clientId: string, profile: MenstrualProfile): void;

  getCurrentPhase(clientId: string): PhaseInfo | null;
  getClientPeriodRecords(clientId: string): PeriodRecord[];
  getClientProfile(clientId: string): MenstrualProfile | null;

  clientPhase: PhaseInfo | null;
  clientPeriodRecords: PeriodRecord[];
  clientProfile: MenstrualProfile | null;
}

const CycleContext = createContext<CycleContextType | null>(null);

// ── Provider ────────────────────────────────────────────────────────

export function CycleProvider({ children }: { children: ReactNode }) {
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>(buildMockRecords);
  const [menstrualProfiles, setMenstrualProfiles] = useState<Record<string, MenstrualProfile>>(MOCK_PROFILES);

  const getClientPeriodRecords = (clientId: string): PeriodRecord[] =>
    periodRecords
      .filter(r => r.clientId === clientId || (clientId === 'c1' && r.clientId === 'client-1'))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const getClientProfile = (clientId: string): MenstrualProfile | null =>
    menstrualProfiles[clientId] ?? menstrualProfiles[clientId === 'c1' ? 'client-1' : clientId] ?? null;

  const getCurrentPhase = (clientId: string): PhaseInfo | null => {
    const profile = getClientProfile(clientId);
    const records = getClientPeriodRecords(clientId);
    if (!profile || records.length === 0) return null;

    const lastPeriodStart = records[0].startDate;
    const today = toISO(new Date());
    const daysSinceStart = daysBetween(lastPeriodStart, today) + 1;
    const cycleLen = profile.averageCycleLength || 28;
    const dayInCycle = ((daysSinceStart - 1) % cycleLen) + 1;
    const phaseInfo = getPhaseForDay(dayInCycle);
    return { ...phaseInfo, dayInCycle };
  };

  const logPeriodDay = (clientId: string, date: string, flow: FlowIntensity, symptoms: CycleSymptom[], notes?: string) => {
    setPeriodRecords(prev => {
      const resolvedId = clientId === 'c1' ? 'client-1' : clientId;
      const copy = prev.map(r => ({ ...r, entries: [...r.entries] }));

      const ongoing = copy.find(r => r.clientId === resolvedId && !r.endDate);
      const entry: PeriodLogEntry = { id: genId('ple'), date, flow, symptoms, notes };

      if (ongoing) {
        const existingIdx = ongoing.entries.findIndex(e => e.date === date);
        if (existingIdx >= 0) {
          ongoing.entries[existingIdx] = entry;
        } else {
          ongoing.entries.push(entry);
          ongoing.entries.sort((a, b) => a.date.localeCompare(b.date));
        }
        const lastDate = ongoing.entries[ongoing.entries.length - 1].date;
        const daysSinceLast = daysBetween(lastDate, date);
        if (daysSinceLast > 2) {
          ongoing.endDate = ongoing.entries[ongoing.entries.length - 2]?.date ?? ongoing.startDate;
          copy.push({ id: genId('pr'), clientId: resolvedId, startDate: date, entries: [entry] });
        }
      } else {
        const lastComplete = copy
          .filter(r => r.clientId === resolvedId && r.endDate)
          .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

        if (lastComplete && daysBetween(lastComplete.endDate!, date) <= 2) {
          delete lastComplete.endDate;
          lastComplete.entries.push(entry);
        } else {
          copy.push({ id: genId('pr'), clientId: resolvedId, startDate: date, entries: [entry] });
        }
      }
      return copy;
    });
  };

  const removePeriodLog = (entryId: string) => {
    setPeriodRecords(prev => {
      const copy = prev.map(r => ({
        ...r,
        entries: r.entries.filter(e => e.id !== entryId),
      }));
      return copy.filter(r => r.entries.length > 0);
    });
  };

  const setMenstrualProfile = (clientId: string, profile: MenstrualProfile) => {
    const resolvedId = clientId === 'c1' ? 'client-1' : clientId;
    setMenstrualProfiles(prev => ({ ...prev, [resolvedId]: profile }));
  };

  const clientPeriodRecords = useMemo(() => getClientPeriodRecords('client-1'), [periodRecords]);
  const clientProfile = useMemo(() => getClientProfile('client-1'), [menstrualProfiles]);
  const clientPhase = useMemo(() => getCurrentPhase('client-1'), [periodRecords, menstrualProfiles]);

  return (
    <CycleContext.Provider value={{
      periodRecords, menstrualProfiles,
      logPeriodDay, removePeriodLog, setMenstrualProfile,
      getCurrentPhase, getClientPeriodRecords, getClientProfile,
      clientPhase, clientPeriodRecords, clientProfile,
    }}>
      {children}
    </CycleContext.Provider>
  );
}

export function useCycle() {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error('useCycle must be used within CycleProvider');
  return ctx;
}

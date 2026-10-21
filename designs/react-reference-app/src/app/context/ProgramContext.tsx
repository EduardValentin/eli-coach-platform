import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAppState } from './AppContext';
import { AWAITING_REVIEW_CALL_ID, DEMO_JOURNEY_CALL_ID, useClientJourneys } from './ClientJourneyContext';
import { useTraining } from './TrainingContext';
import { canStartWork, workStartDate } from '../domain/coachingSubscription';
import { cycleModeOf, type CycleMode } from '../domain/cycleMode';
import type { ClientJourney } from '../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../domain/onboardingAnswers';
import {
  contentWithFreshIds,
  currentVersion,
  draftOf,
  type Program,
  type ProgramContent,
  type ProgramVersion,
} from '../domain/program';
import { weekdayFromOnboarding } from '../domain/programCalendar';
import { clientEquipment, type ProgramSetup } from '../domain/programOnboarding';
import {
  blockingProblems,
  type BlockingCode,
  type RuleContext,
  type RuleFinding,
} from '../domain/programRules';
import { initialContent } from '../domain/programSuggestions';
import { programForSeed, type ProgramSeed, type SeedClient } from '../services/programSamples';

export type PublishOutcome =
  | { status: 'published'; version: ProgramVersion }
  | { status: 'blocked'; problems: RuleFinding<BlockingCode>[] };

export type ProgramContextType = {
  programFor(callId: string): Program | undefined;
  createProgram(callId: string, setup: ProgramSetup): Program;
  updateSetup(callId: string, patch: Partial<Pick<Program, 'goal' | 'equipment' | 'level' | 'cycleMode' | 'language'>>): void;
  updateDraft(callId: string, update: (content: ProgramContent) => ProgramContent): void;
  setWhatChanged(callId: string, text: string): void;
  startDraft(callId: string): void;
  discardDraft(callId: string): void;
  publishDraft(callId: string, now: Date): PublishOutcome;
  programs(): Program[];
  exerciseConsumers(): { exerciseIds: string[] }[];
};

const ProgramContext = createContext<ProgramContextType | null>(null);

function seededCycleMode(journey: ClientJourney | null): CycleMode {
  return (journey && cycleModeOf(journey.onboarding, journey.identity.gender)) ?? 'general';
}

function seedClient(callId: string, journey: ClientJourney | null, dayOne: Date | null): SeedClient {
  return { callId, dayOne, cycleMode: seededCycleMode(journey), equipment: journey ? clientEquipment(journey) : [] };
}

export function dayOneOf(journey: ClientJourney | null): Date | null {
  return journey?.programReadyAt ?? null;
}

function withVersion(program: Program, number: number, change: (version: ProgramVersion) => ProgramVersion): Program {
  return { ...program, versions: program.versions.map(version => (version.number === number ? change(version) : version)) };
}

function exerciseIdsOf(version: ProgramVersion): string[] {
  const ids = version.content.plan.blocks.flatMap(block =>
    block.sessions.flatMap(session => [
      ...session.warmUp.mobilityExerciseIds,
      ...session.rows.flatMap(row => [row.exerciseId, ...row.substitutions]),
    ]),
  );
  return [...new Set(ids.filter(id => id !== ''))];
}

function publishedAfter(program: Program, version: ProgramVersion, now: Date): Program {
  return {
    ...program,
    versions: program.versions.map(other => {
      if (other.number === version.number) return { ...other, state: 'published', publishedAt: now };
      return other.state === 'published' ? { ...other, state: 'superseded' } : other;
    }),
  };
}

export function ProgramProvider({ children }: { children: ReactNode }) {
  const { appState } = useAppState();
  const { exercises } = useTraining();
  const { demoJourney, journeyForCall, markProgramReady } = useClientJourneys();
  const [programsByCall, setPrograms] = useState<Record<string, Program>>({});
  const programsRef = useRef(programsByCall);
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;
  const seededSeed = useRef<ProgramSeed>('none');
  const readyAt = demoJourney?.programReadyAt ?? null;

  const commit = useCallback((next: Record<string, Program>) => {
    programsRef.current = next;
    setPrograms(next);
  }, []);

  const change = useCallback(
    (callId: string, update: (program: Program) => Program) => {
      const program = programsRef.current[callId];
      if (program) commit({ ...programsRef.current, [callId]: update(program) });
    },
    [commit],
  );

  useEffect(() => {
    const seed = appState.programSeed;
    const seedChanged = seed !== seededSeed.current;
    const demo = programsRef.current[DEMO_JOURNEY_CALL_ID];
    const consistent = demo?.versions.some(version => version.publishedAt?.getTime() === readyAt?.getTime());
    if (!seedChanged && (seed === 'none' || consistent)) return;
    seededSeed.current = seed;
    const library = exercisesRef.current;
    const next = { ...programsRef.current };
    delete next[DEMO_JOURNEY_CALL_ID];
    delete next[AWAITING_REVIEW_CALL_ID];
    const seeded = programForSeed(seed, seedClient(DEMO_JOURNEY_CALL_ID, demoJourney, readyAt), library);
    if (seeded) next[DEMO_JOURNEY_CALL_ID] = seeded;
    const awaitingReview = seedClient(AWAITING_REVIEW_CALL_ID, journeyForCall(AWAITING_REVIEW_CALL_ID), readyAt);
    const reference = seed === 'two-versions' ? programForSeed('published', awaitingReview, library) : null;
    if (reference) next[AWAITING_REVIEW_CALL_ID] = reference;
    commit(next);
  }, [appState.programSeed, readyAt, demoJourney, journeyForCall, commit]);

  const programFor = useCallback((callId: string) => programsByCall[callId], [programsByCall]);
  const programs = useCallback(() => Object.values(programsByCall), [programsByCall]);

  const createProgram = useCallback(
    (callId: string, setup: ProgramSetup): Program => {
      const program: Program = {
        callId,
        goal: setup.goal,
        equipment: setup.equipment,
        language: setup.language,
        cycleMode: setup.cycleMode,
        level: setup.level,
        versions: [{ number: 1, state: 'draft', publishedAt: null, whatChanged: '', content: initialContent(setup, exercisesRef.current) }],
      };
      commit({ ...programsRef.current, [callId]: program });
      return program;
    },
    [commit],
  );

  const updateSetup = useCallback<ProgramContextType['updateSetup']>(
    (callId, patch) => change(callId, program => ({ ...program, ...patch })),
    [change],
  );

  const updateDraft = useCallback<ProgramContextType['updateDraft']>(
    (callId, update) =>
      change(callId, program => {
        const draft = draftOf(program);
        return draft ? withVersion(program, draft.number, version => ({ ...version, content: update(version.content) })) : program;
      }),
    [change],
  );

  const setWhatChanged = useCallback<ProgramContextType['setWhatChanged']>(
    (callId, text) =>
      change(callId, program => {
        const draft = draftOf(program);
        return draft ? withVersion(program, draft.number, version => ({ ...version, whatChanged: text })) : program;
      }),
    [change],
  );

  const startDraft = useCallback<ProgramContextType['startDraft']>(
    callId =>
      change(callId, program => {
        const current = currentVersion(program);
        if (draftOf(program) || !current) return program;
        const draft: ProgramVersion = {
          number: current.number + 1,
          state: 'draft',
          publishedAt: null,
          whatChanged: '',
          content: contentWithFreshIds(current.content),
        };
        return { ...program, versions: [...program.versions, draft] };
      }),
    [change],
  );

  const discardDraft = useCallback<ProgramContextType['discardDraft']>(
    callId => {
      const program = programsRef.current[callId];
      if (!program) return;
      const versions = program.versions.filter(version => version.state !== 'draft');
      const next = { ...programsRef.current, [callId]: { ...program, versions } };
      if (versions.length === 0) delete next[callId];
      commit(next);
    },
    [commit],
  );

  const publishDraft = useCallback<ProgramContextType['publishDraft']>(
    (callId, now) => {
      const program = programsRef.current[callId];
      const draft = program && draftOf(program);
      if (!program || !draft) return { status: 'blocked', problems: [] };
      const journey = journeyForCall(callId);
      const subscription = journey?.subscription;
      const dayOne = dayOneOf(journey);
      const context: RuleContext = {
        versionNumber: draft.number,
        publishDay: now,
        dayOne,
        preferredWeekday: weekdayFromOnboarding(
          journey ? collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY) : null,
        ),
        level: program.level,
        startDate: subscription && !canStartWork(subscription, now) ? workStartDate(subscription) : null,
        detailsPending: journey?.stage === 'needs-details',
        publishedBlocks: currentVersion(program)?.content.plan.blocks ?? null,
        exercisesById: new Map(exercisesRef.current.map(exercise => [exercise.id, exercise])),
      };
      const problems = blockingProblems(draft.content, draft.whatChanged, context);
      if (problems.length > 0) return { status: 'blocked', problems };
      commit({ ...programsRef.current, [callId]: publishedAfter(program, draft, now) });
      if (draft.number === 1) markProgramReady(callId, now);
      return { status: 'published', version: { ...draft, state: 'published', publishedAt: now } };
    },
    [commit, journeyForCall, markProgramReady],
  );

  const exerciseConsumers = useCallback(
    () => Object.values(programsByCall).flatMap(program => program.versions.map(version => ({ exerciseIds: exerciseIdsOf(version) }))),
    [programs],
  );

  const value = useMemo<ProgramContextType>(
    () => ({ programFor, programs, createProgram, updateSetup, updateDraft, setWhatChanged, startDraft, discardDraft, publishDraft, exerciseConsumers }),
    [programFor, programs, createProgram, updateSetup, updateDraft, setWhatChanged, startDraft, discardDraft, publishDraft, exerciseConsumers],
  );

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function usePrograms(): ProgramContextType {
  const context = useContext(ProgramContext);
  if (!context) throw new Error('usePrograms must be used within a ProgramProvider');
  return context;
}

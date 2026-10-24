import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAppState } from './AppContext';
import { AWAITING_REVIEW_CALL_ID, DEMO_JOURNEY_CALL_ID, useClientJourneys } from './ClientJourneyContext';
import { useTraining } from './TrainingContext';
import { coachingFactsFromAnswers, type CoachingFacts } from '../domain/clientProfile';
import type { ClientJourney } from '../domain/journey';
import {
  contentWithFreshIds,
  currentVersion,
  draftOf,
  programExerciseIds,
  type Program,
  type ProgramContent,
  type ProgramVersion,
} from '../domain/program';
import { libraryEquipmentFor, type ProgramSetup } from '../domain/programOnboarding';
import { blockingProblems, ruleContextFor, type BlockingCode, type RuleFinding } from '../domain/programRules';
import { initialContent } from '../domain/programSuggestions';
import { seededPrograms, type ProgramSeed, type SeedClient } from '../services/programSamples';

export type PublishOutcome =
  | { status: 'published'; version: ProgramVersion }
  | { status: 'blocked'; problems: RuleFinding<BlockingCode>[] };

export type ProgramContextType = {
  hydrated: boolean;
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

function seedFacts(journey: ClientJourney): CoachingFacts {
  return journey.profile.coaching ?? coachingFactsFromAnswers(journey.onboarding, journey.profile.identity.gender);
}

function seedClient(callId: string, journey: ClientJourney | null, dayOne: Date | null): SeedClient {
  const facts = journey && seedFacts(journey);
  return { callId, dayOne, cycleMode: facts?.cycleMode ?? 'general', equipment: facts ? libraryEquipmentFor(facts.equipment) : [] };
}

function withVersion(program: Program, number: number, change: (version: ProgramVersion) => ProgramVersion): Program {
  return { ...program, versions: program.versions.map(version => (version.number === number ? change(version) : version)) };
}

function withoutSeededCalls(programs: Record<string, Program>): Record<string, Program> {
  const next = { ...programs };
  delete next[DEMO_JOURNEY_CALL_ID];
  delete next[AWAITING_REVIEW_CALL_ID];
  return next;
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
  const [hydrated, setHydrated] = useState(false);
  const appliedSeed = useRef<ProgramSeed>('none');
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

  const changeDraft = useCallback(
    (callId: string, update: (version: ProgramVersion) => ProgramVersion) =>
      change(callId, program => {
        const draft = draftOf(program);
        return draft ? withVersion(program, draft.number, update) : program;
      }),
    [change],
  );

  useEffect(() => {
    setHydrated(true);
    const seed = appState.programSeed;
    const seedChanged = seed !== appliedSeed.current;
    const demo = programsRef.current[DEMO_JOURNEY_CALL_ID];
    const consistent = demo?.versions.some(version => version.publishedAt?.getTime() === readyAt?.getTime());
    if (!seedChanged && (seed === 'none' || consistent)) return;
    appliedSeed.current = seed;
    const clients = {
      demo: seedClient(DEMO_JOURNEY_CALL_ID, demoJourney, readyAt),
      awaitingReview: seedClient(AWAITING_REVIEW_CALL_ID, journeyForCall(AWAITING_REVIEW_CALL_ID), readyAt),
    };
    commit({ ...withoutSeededCalls(programsRef.current), ...seededPrograms(seed, clients, exercisesRef.current) });
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
    (callId, update) => changeDraft(callId, version => ({ ...version, content: update(version.content) })),
    [changeDraft],
  );

  const setWhatChanged = useCallback<ProgramContextType['setWhatChanged']>(
    (callId, text) => changeDraft(callId, version => ({ ...version, whatChanged: text })),
    [changeDraft],
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
      const context = ruleContextFor({ journey: journeyForCall(callId), program, draft, today: now, exercises: exercisesRef.current });
      const problems = blockingProblems(draft.content, draft.whatChanged, context);
      if (problems.length > 0) return { status: 'blocked', problems };
      commit({ ...programsRef.current, [callId]: publishedAfter(program, draft, now) });
      if (draft.number === 1) markProgramReady(callId, now);
      return { status: 'published', version: { ...draft, state: 'published', publishedAt: now } };
    },
    [commit, journeyForCall, markProgramReady],
  );

  const exerciseConsumers = useCallback(
    () => Object.values(programsByCall).map(program => ({ exerciseIds: programExerciseIds(program) })),
    [programsByCall],
  );

  const value = useMemo<ProgramContextType>(
    () => ({ hydrated, programFor, programs, createProgram, updateSetup, updateDraft, setWhatChanged, startDraft, discardDraft, publishDraft, exerciseConsumers }),
    [hydrated, programFor, programs, createProgram, updateSetup, updateDraft, setWhatChanged, startDraft, discardDraft, publishDraft, exerciseConsumers],
  );

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function usePrograms(): ProgramContextType {
  const context = useContext(ProgramContext);
  if (!context) throw new Error('usePrograms must be used within a ProgramProvider');
  return context;
}

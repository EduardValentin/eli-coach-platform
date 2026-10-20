import type { Exercise } from '../context/TrainingContext';
import type { CycleMode } from '../domain/cycleMode';
import { EQUIPMENT } from '../domain/exercises';
import { contentWithFreshIds, type Program, type ProgramContent, type Row, type Session } from '../domain/program';
import type { ProgramSetup } from '../domain/programOnboarding';
import { initialContent, substitutionsFor } from '../domain/programSuggestions';

export const PROGRAM_SEEDS = ['none', 'draft', 'published', 'two-versions'] as const;
export type ProgramSeed = (typeof PROGRAM_SEEDS)[number];

const SEED_SETUP: ProgramSetup = {
  goal: 'Lose fat',
  level: 'beginner',
  trainingDays: 3,
  sessionMinutes: 60,
  cycleMode: 'adapted',
  language: 'en',
  dailySteps: 6000,
};

const TWO_VERSIONS_WHAT_CHANGED =
  'Added a second lower day and raised steps to 8,000, because your technique is stable and energy is good.';

function pickFrom(pool: readonly Exercise[], offset: number, used: ReadonlySet<string>): Exercise | undefined {
  const rotated = pool.map((_, index) => pool[(index + offset) % pool.length]);
  return rotated.find(exercise => !used.has(exercise.id)) ?? rotated[0];
}

function exerciseForSlot(row: Row, library: readonly Exercise[], sessionIndex: number, used: ReadonlySet<string>) {
  const active = library.filter(exercise => exercise.type === 'resistance' && exercise.archivedAt === undefined);
  const byRole = (role: Exercise['role']) => active.filter(exercise => exercise.role === role);
  if (row.slot === 'A') return pickFrom(byRole('main-compound'), sessionIndex * 2, used);
  if (row.slot === 'B') return pickFrom(byRole('secondary-compound'), sessionIndex, used);
  if (row.slot === 'D') return pickFrom(active.filter(exercise => exercise.pattern === 'core'), 0, used);
  return pickFrom(byRole('isolation'), sessionIndex, used);
}

function filledSession(session: Session, sessionIndex: number, library: readonly Exercise[]): Session {
  const used = new Set<string>();
  const rows = session.rows.map(row => {
    const exercise = exerciseForSlot(row, library, sessionIndex, used);
    if (!exercise) return row;
    used.add(exercise.id);
    return {
      ...row,
      exerciseId: exercise.id,
      cues: exercise.cues,
      substitutions: substitutionsFor(exercise, library, EQUIPMENT),
    };
  });
  return { ...session, rows };
}

function filledContent(library: readonly Exercise[], cycleMode: CycleMode): ProgramContent {
  const content = initialContent({ ...SEED_SETUP, cycleMode });
  return {
    ...content,
    plan: {
      blocks: content.plan.blocks.map(block => ({
        ...block,
        sessions: block.sessions.map((session, index) => filledSession(session, index, library)),
      })),
    },
  };
}

function programOf(callId: string, cycleMode: CycleMode, versions: Program['versions']): Program {
  return {
    callId,
    goal: SEED_SETUP.goal,
    language: SEED_SETUP.language,
    cycleMode,
    level: SEED_SETUP.level,
    versions,
  };
}

function twoVersions(callId: string, cycleMode: CycleMode, publishedAt: Date, content: ProgramContent): Program {
  const [first, ...rest] = content.plan.blocks;
  const raised: ProgramContent = {
    ...content,
    plan: { blocks: [{ ...first, dailySteps: 8000 }, ...rest] },
  };
  return programOf(callId, cycleMode, [
    { number: 1, state: 'superseded', publishedAt, whatChanged: '', content },
    { number: 2, state: 'published', publishedAt, whatChanged: TWO_VERSIONS_WHAT_CHANGED, content: raised },
    { number: 3, state: 'draft', publishedAt: null, whatChanged: '', content: contentWithFreshIds(raised) },
  ]);
}

export function programForSeed(
  seed: ProgramSeed,
  callId: string,
  dayOne: Date | null,
  library: readonly Exercise[],
  cycleMode: CycleMode,
): Program | null {
  if (seed === 'none') return null;
  const content = filledContent(library, cycleMode);
  const publishedAt = dayOne ?? new Date();
  if (seed === 'draft') {
    return programOf(callId, cycleMode, [{ number: 1, state: 'draft', publishedAt: null, whatChanged: '', content }]);
  }
  if (seed === 'published') {
    return programOf(callId, cycleMode, [{ number: 1, state: 'published', publishedAt, whatChanged: '', content }]);
  }
  return twoVersions(callId, cycleMode, publishedAt, content);
}

import type { Exercise } from '../context/TrainingContext';
import { newId, type CardioIntensity, type CardioPlan, type CardioSegment, type CardioSession, type CircuitItem } from './program';

export type CardioPresetKind = 'liss' | 'moderate' | 'hiit' | 'finisher';
export type SegmentKind = CardioPlan['kind'];
export const CARDIO_PRESET_KINDS: readonly CardioPresetKind[] = ['liss', 'moderate', 'hiit', 'finisher'];
export const SEGMENT_KINDS: readonly SegmentKind[] = ['steady', 'intervals', 'circuit'];
export const SEGMENT_KIND_LABELS: Record<SegmentKind, string> = { steady: 'Steady', intervals: 'Intervals', circuit: 'Circuit' };
export const CARDIO_INTENSITY_LABELS: Record<CardioIntensity, string> = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

export const CARDIO_INTENSITY_TEXT: Record<CardioIntensity, string> = {
  easy: 'You can hold a conversation',
  moderate: 'You can talk, but not sing',
  hard: 'Hard: only a few words at a time',
};

const STEADY_NAME_PATTERN = /walk|bike|cycling|ellip/i;
const SECONDS_PER_REP = 3;
const SECONDS_PER_MINUTE = 60;
const FINISHER_EXERCISES = 2;

export const CARDIO_PRESET_NAMES: Record<CardioPresetKind, string> = {
  liss: 'Easy cardio',
  moderate: 'Moderate cardio',
  hiit: 'Intervals',
  finisher: 'Finisher',
};

function available(library: readonly Exercise[]): Exercise[] {
  return library.filter(exercise => exercise.archivedAt === undefined);
}

function steadyExerciseId(library: readonly Exercise[]): string {
  const cardio = available(library).filter(exercise => exercise.type === 'cardio');
  const picked = cardio.find(exercise => STEADY_NAME_PATTERN.test(exercise.name)) ?? cardio[0];
  return picked?.id ?? '';
}

function segment(exerciseId: string, plan: CardioPlan): CardioSegment {
  return { id: newId(), exerciseId, plan };
}

function steady(exerciseId: string, minutes: number, intensity: CardioIntensity): CardioSegment {
  return segment(exerciseId, { kind: 'steady', minutes, intensity });
}

function finisherCircuit(library: readonly Exercise[]): CardioSegment {
  const bodyweight = available(library)
    .filter(exercise => exercise.type === 'resistance' && exercise.equipment.length === 0)
    .slice(0, FINISHER_EXERCISES);
  const items = bodyweight.map(exercise => ({ exerciseId: exercise.id, seconds: 30 }));
  return segment(items[0]?.exerciseId ?? '', { kind: 'circuit', items, rounds: 3, restSeconds: 60 });
}

function presetSegments(kind: CardioPresetKind, library: readonly Exercise[]): CardioSegment[] {
  if (kind === 'finisher') return [finisherCircuit(library)];
  const exerciseId = steadyExerciseId(library);
  if (kind === 'liss') return [steady(exerciseId, 30, 'easy')];
  if (kind === 'moderate') return [steady(exerciseId, 25, 'moderate')];
  return [
    steady(exerciseId, 5, 'easy'),
    segment(exerciseId, { kind: 'intervals', workSeconds: 30, easySeconds: 90, rounds: 8, intensity: 'hard' }),
    steady(exerciseId, 5, 'easy'),
  ];
}

export function cardioPreset(kind: CardioPresetKind, library: readonly Exercise[]): CardioSession {
  const id = newId();
  return { id, originId: id, name: CARDIO_PRESET_NAMES[kind], segments: presetSegments(kind, library) };
}

function planSeconds(plan: CardioPlan): number {
  if (plan.kind === 'steady') return plan.minutes * SECONDS_PER_MINUTE;
  if (plan.kind === 'intervals') return (plan.workSeconds + plan.easySeconds) * plan.rounds;
  const roundSeconds = plan.items.reduce((total, item) => total + (item.seconds ?? (item.reps ?? 0) * SECONDS_PER_REP), 0);
  return roundSeconds * plan.rounds + plan.restSeconds * Math.max(0, plan.rounds - 1);
}

export function cardioMinutes(session: CardioSession): number {
  const seconds = session.segments.reduce((total, { plan }) => total + planSeconds(plan), 0);
  return Math.round(seconds / SECONDS_PER_MINUTE);
}

export function hasIntervals(session: CardioSession): boolean {
  return session.segments.some(({ plan }) => plan.kind === 'intervals');
}

export function isLightCardio(session: CardioSession): boolean {
  return session.segments.every(({ plan }) => plan.kind === 'steady' && plan.intensity === 'easy');
}

const NEW_SEGMENT_PLANS: Record<SegmentKind, CardioPlan> = {
  steady: { kind: 'steady', minutes: 10, intensity: 'moderate' },
  intervals: { kind: 'intervals', workSeconds: 30, easySeconds: 90, rounds: 6, intensity: 'hard' },
  circuit: { kind: 'circuit', items: [], rounds: 3, restSeconds: 60 },
};
const CIRCUIT_REPS = 12;
const CIRCUIT_SECONDS = 30;

export function emptyCardioSession(): CardioSession {
  const id = newId();
  return { id, originId: id, name: 'Cardio', segments: [] };
}

function circuitItem(exercise: Exercise | undefined, exerciseId: string): CircuitItem {
  return exercise?.measuredIn === 'time' ? { exerciseId, seconds: CIRCUIT_SECONDS } : { exerciseId, reps: CIRCUIT_REPS };
}

function withItems(segment: CardioSegment, change: (items: CircuitItem[]) => CircuitItem[]): CardioSegment {
  if (segment.plan.kind !== 'circuit') return segment;
  const items = change(segment.plan.items);
  return { ...segment, exerciseId: items[0]?.exerciseId ?? '', plan: { ...segment.plan, items } };
}

export function cardioEdits(session: CardioSession, library: readonly Exercise[]) {
  const { segments } = session;
  const withSegments = (next: CardioSegment[]): CardioSession => ({ ...session, segments: next });
  const mapSegment = (segmentId: string, change: (segment: CardioSegment) => CardioSegment) =>
    withSegments(segments.map(other => (other.id === segmentId ? change(other) : other)));

  function swapWithNeighbour(segmentId: string, step: number): CardioSession {
    const index = segments.findIndex(other => other.id === segmentId);
    const target = index + step;
    if (index < 0 || target < 0 || target >= segments.length) return session;
    const next = [...segments];
    [next[index], next[target]] = [next[target], next[index]];
    return withSegments(next);
  }

  return {
    session,
    applyPreset(kind: CardioPresetKind): CardioSession {
      const preset = cardioPreset(kind, library);
      return { ...session, name: preset.name, segments: preset.segments };
    },
    addSegment(kind: SegmentKind): CardioSession {
      const exerciseId = kind === 'circuit' ? '' : steadyExerciseId(library);
      return withSegments([...segments, segment(exerciseId, structuredClone(NEW_SEGMENT_PLANS[kind]))]);
    },
    addSteady(exerciseId: string): CardioSession {
      return withSegments([...segments, segment(exerciseId, structuredClone(NEW_SEGMENT_PLANS.steady))]);
    },
    replaceExercise(segmentId: string, exerciseId: string): CardioSession {
      return mapSegment(segmentId, other => ({ ...other, exerciseId }));
    },
    changePlan(segmentId: string, plan: CardioPlan): CardioSession {
      return mapSegment(segmentId, other => ({ ...other, plan }));
    },
    moveUp(segmentId: string): CardioSession {
      return swapWithNeighbour(segmentId, -1);
    },
    moveDown(segmentId: string): CardioSession {
      return swapWithNeighbour(segmentId, 1);
    },
    moveBefore(segmentId: string, beforeSegmentId: string): CardioSession {
      const moving = segments.find(other => other.id === segmentId);
      if (!moving || segmentId === beforeSegmentId) return session;
      const rest = segments.filter(other => other.id !== segmentId);
      const before = rest.findIndex(other => other.id === beforeSegmentId);
      return withSegments([...rest.slice(0, before), moving, ...rest.slice(before)]);
    },
    remove(segmentId: string): CardioSession {
      return withSegments(segments.filter(other => other.id !== segmentId));
    },
    addCircuitItem(segmentId: string, exerciseId: string): CardioSession {
      const exercise = library.find(item => item.id === exerciseId);
      return mapSegment(segmentId, other => withItems(other, items => [...items, circuitItem(exercise, exerciseId)]));
    },
    changeCircuitItem(segmentId: string, index: number, item: CircuitItem): CardioSession {
      return mapSegment(segmentId, other => withItems(other, items => items.map((current, at) => (at === index ? item : current))));
    },
    removeCircuitItem(segmentId: string, index: number): CardioSession {
      return mapSegment(segmentId, other => withItems(other, items => items.filter((_, at) => at !== index)));
    },
  };
}

export type CardioEdits = ReturnType<typeof cardioEdits>;

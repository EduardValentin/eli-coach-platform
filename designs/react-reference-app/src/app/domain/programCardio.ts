import type { Exercise } from '../context/TrainingContext';
import { newId, swappedWithNeighbour, type CardioIntensity, type CardioSegment, type CardioSession, type RoundsItem, type RoundsSegment, type SteadySegment } from './program';

export type CardioPresetKind = 'liss' | 'moderate' | 'hiit' | 'finisher';
export type SegmentKind = CardioSegment['kind'];
export const CARDIO_PRESET_KINDS: readonly CardioPresetKind[] = ['liss', 'moderate', 'hiit', 'finisher'];
export const SEGMENT_KINDS: readonly SegmentKind[] = ['steady', 'rounds'];
export const SEGMENT_KIND_LABELS: Record<SegmentKind, string> = { steady: 'Steady', rounds: 'Rounds' };
export const CARDIO_INTENSITY_LABELS: Record<CardioIntensity, string> = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

export const CARDIO_INTENSITY_TEXT: Record<CardioIntensity, string> = {
  easy: 'You can hold a conversation',
  moderate: 'You can talk, but not sing',
  hard: 'Hard: only a few words at a time',
};

const STEADY_NAME_PATTERN = /walk|bike|cycling|ellip/i;
const SECONDS_PER_REP = 3;
const SECONDS_PER_MINUTE = 60;
const FINISHER_EXERCISES = 3;
const PRESET_WORK_SECONDS = 30;
const NEW_ITEM_REPS = 12;
const NEW_ITEM_SECONDS = 30;

export const CARDIO_PRESET_NAMES: Record<CardioPresetKind, string> = {
  liss: 'Easy cardio',
  moderate: 'Moderate cardio',
  hiit: 'Intervals',
  finisher: 'Finisher',
};

function available(library: readonly Exercise[]): Exercise[] {
  return library.filter(exercise => exercise.archivedAt === undefined);
}

function isConditioning(exercise: Exercise): boolean {
  return exercise.tags.includes('Conditioning');
}

function steadyExerciseId(library: readonly Exercise[]): string {
  const cardio = available(library).filter(exercise => exercise.type === 'cardio');
  const picked = cardio.find(exercise => STEADY_NAME_PATTERN.test(exercise.name)) ?? cardio[0];
  return picked?.id ?? '';
}

function steady(exerciseId: string, minutes: number, intensity: CardioIntensity): SteadySegment {
  return { id: newId(), kind: 'steady', exerciseId, minutes, intensity };
}

function timedItem(exercise: Exercise): RoundsItem {
  return { id: newId(), exerciseId: exercise.id, workSeconds: PRESET_WORK_SECONDS };
}

function intervalRounds(library: readonly Exercise[]): RoundsSegment {
  const exercise = available(library).find(item => item.type === 'cardio' || isConditioning(item));
  return {
    id: newId(),
    kind: 'rounds',
    items: exercise ? [timedItem(exercise)] : [],
    easySeconds: 90,
    restBetweenRoundsSeconds: 0,
    rounds: 8,
    intensity: 'hard',
  };
}

function finisherRounds(library: readonly Exercise[]): RoundsSegment {
  const conditioning = available(library).filter(isConditioning).slice(0, FINISHER_EXERCISES);
  return {
    id: newId(),
    kind: 'rounds',
    items: conditioning.map(timedItem),
    easySeconds: 0,
    restBetweenRoundsSeconds: 60,
    rounds: 3,
    intensity: 'hard',
  };
}

function presetSegments(kind: CardioPresetKind, library: readonly Exercise[]): CardioSegment[] {
  if (kind === 'finisher') return [finisherRounds(library)];
  const exerciseId = steadyExerciseId(library);
  if (kind === 'liss') return [steady(exerciseId, 30, 'easy')];
  if (kind === 'moderate') return [steady(exerciseId, 25, 'moderate')];
  return [steady(exerciseId, 5, 'easy'), intervalRounds(library), steady(exerciseId, 5, 'easy')];
}

export function cardioPreset(kind: CardioPresetKind, library: readonly Exercise[]): CardioSession {
  const id = newId();
  return { id, originId: id, name: CARDIO_PRESET_NAMES[kind], segments: presetSegments(kind, library) };
}

function itemSeconds(item: RoundsItem): number {
  return item.workSeconds ?? (item.reps ?? 0) * SECONDS_PER_REP;
}

function segmentSeconds(segment: CardioSegment): number {
  if (segment.kind === 'steady') return segment.minutes * SECONDS_PER_MINUTE;
  const work = segment.items.reduce((total, item) => total + itemSeconds(item), 0);
  const easy = segment.easySeconds * segment.items.length;
  return (work + easy) * segment.rounds + segment.restBetweenRoundsSeconds * Math.max(0, segment.rounds - 1);
}

export function segmentMinutes(segment: CardioSegment): number {
  return Math.round(segmentSeconds(segment) / SECONDS_PER_MINUTE);
}

export function cardioMinutes(session: CardioSession): number {
  const seconds = session.segments.reduce((total, segment) => total + segmentSeconds(segment), 0);
  return Math.round(seconds / SECONDS_PER_MINUTE);
}

function itemAmount(item: RoundsItem): string {
  return item.workSeconds === undefined ? `${item.reps ?? 0} reps` : `${item.workSeconds} s`;
}

export function roundsText(segment: RoundsSegment, nameOf: (exerciseId: string) => string): string {
  const items = segment.items.map(item => `${nameOf(item.exerciseId)} ${itemAmount(item)}`);
  return `${segment.rounds} rounds · ${items.join(', ')}`;
}

export function hasHardRounds(session: CardioSession): boolean {
  return session.segments.some(segment => segment.kind === 'rounds' && segment.intensity === 'hard');
}

export function isLightCardio(session: CardioSession): boolean {
  return session.segments.every(segment => segment.kind === 'steady' && segment.intensity === 'easy');
}

function newSteady(exerciseId: string): SteadySegment {
  return steady(exerciseId, 10, 'moderate');
}

function newSegment(kind: SegmentKind, library: readonly Exercise[]): CardioSegment {
  if (kind === 'steady') return newSteady(steadyExerciseId(library));
  return { id: newId(), kind: 'rounds', items: [], easySeconds: 0, restBetweenRoundsSeconds: 60, rounds: 3, intensity: 'hard' };
}

export function emptyCardioSession(): CardioSession {
  const id = newId();
  return { id, originId: id, name: 'Cardio', segments: [] };
}

function newItem(exercise: Exercise | undefined, exerciseId: string): RoundsItem {
  if (exercise?.measuredIn === 'time') return { id: newId(), exerciseId, workSeconds: NEW_ITEM_SECONDS };
  return { id: newId(), exerciseId, reps: NEW_ITEM_REPS };
}

function withItems(segment: CardioSegment, change: (items: RoundsItem[]) => RoundsItem[]): CardioSegment {
  if (segment.kind !== 'rounds') return segment;
  return { ...segment, items: change(segment.items) };
}

export function cardioEdits(session: CardioSession, library: readonly Exercise[]) {
  const { segments } = session;
  const withSegments = (next: CardioSegment[]): CardioSession => ({ ...session, segments: next });
  const mapSegment = (segmentId: string, change: (segment: CardioSegment) => CardioSegment) =>
    withSegments(segments.map(other => (other.id === segmentId ? change(other) : other)));

  function swapWithNeighbour(segmentId: string, step: number): CardioSession {
    const next = swappedWithNeighbour(segments, segmentId, step);
    return next === segments ? session : withSegments(next);
  }

  function moveRoundsItem(segmentId: string, itemId: string, step: number): CardioSession {
    const segment = segments.find(other => other.id === segmentId);
    if (segment?.kind !== 'rounds') return session;
    const items = swappedWithNeighbour(segment.items, itemId, step);
    return items === segment.items ? session : mapSegment(segmentId, () => ({ ...segment, items }));
  }

  return {
    session,
    applyPreset(kind: CardioPresetKind): CardioSession {
      const preset = cardioPreset(kind, library);
      return { ...session, name: preset.name, segments: preset.segments };
    },
    addSegment(kind: SegmentKind): CardioSession {
      return withSegments([...segments, newSegment(kind, library)]);
    },
    addSteady(exerciseId: string): CardioSession {
      return withSegments([...segments, newSteady(exerciseId)]);
    },
    replaceExercise(segmentId: string, exerciseId: string): CardioSession {
      return mapSegment(segmentId, other => (other.kind === 'steady' ? { ...other, exerciseId } : other));
    },
    changeSegment(segment: CardioSegment): CardioSession {
      return mapSegment(segment.id, () => segment);
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
    addRoundsItem(segmentId: string, exerciseId: string): CardioSession {
      const exercise = library.find(item => item.id === exerciseId);
      return mapSegment(segmentId, other => withItems(other, items => [...items, newItem(exercise, exerciseId)]));
    },
    changeRoundsItem(segmentId: string, item: RoundsItem): CardioSession {
      return mapSegment(segmentId, other => withItems(other, items => items.map(current => (current.id === item.id ? item : current))));
    },
    moveRoundsItemUp(segmentId: string, itemId: string): CardioSession {
      return moveRoundsItem(segmentId, itemId, -1);
    },
    moveRoundsItemDown(segmentId: string, itemId: string): CardioSession {
      return moveRoundsItem(segmentId, itemId, 1);
    },
    removeRoundsItem(segmentId: string, itemId: string): CardioSession {
      return mapSegment(segmentId, other => withItems(other, items => items.filter(current => current.id !== itemId)));
    },
  };
}

export type CardioEdits = ReturnType<typeof cardioEdits>;

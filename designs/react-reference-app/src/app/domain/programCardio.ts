import type { Exercise } from '../context/TrainingContext';
import { newId, type CardioIntensity, type CardioPlan, type CardioSegment, type CardioSession } from './program';

export type CardioPresetKind = 'liss' | 'moderate' | 'hiit' | 'finisher';

export const CARDIO_INTENSITY_TEXT: Record<CardioIntensity, string> = {
  easy: 'You can hold a conversation',
  moderate: 'You can talk, but not sing',
  hard: 'Hard: only a few words at a time',
};

const STEADY_NAME_PATTERN = /walk|bike|cycling|ellip/i;
const SECONDS_PER_REP = 3;
const SECONDS_PER_MINUTE = 60;
const FINISHER_EXERCISES = 2;

const PRESET_NAMES: Record<CardioPresetKind, string> = {
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
  return { id, originId: id, name: PRESET_NAMES[kind], segments: presetSegments(kind, library) };
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

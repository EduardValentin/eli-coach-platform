import type { Exercise } from '../context/TrainingContext';
import type { Equipment } from './exercises';

export const MAX_SUBSTITUTIONS = 2;
const LIGHT_EQUIPMENT: readonly Equipment[] = ['Bands', 'Dumbbells'];

function isLight(exercise: Exercise): boolean {
  return exercise.equipment.every(item => LIGHT_EQUIPMENT.includes(item));
}

function pickPair(candidates: Exercise[]): Exercise[] {
  const light = candidates.find(isLight);
  const heavy = candidates.find(candidate => !isLight(candidate));
  const picked = [light, heavy].filter((candidate): candidate is Exercise => candidate !== undefined);
  const rest = candidates.filter(candidate => !picked.includes(candidate));
  return [...picked, ...rest].slice(0, MAX_SUBSTITUTIONS);
}

export function substitutionsFor(exercise: Exercise, library: readonly Exercise[], equipment: readonly Equipment[]): string[] {
  const candidates = library.filter(
    other =>
      other.id !== exercise.id &&
      other.archivedAt === undefined &&
      other.pattern !== undefined &&
      other.pattern === exercise.pattern &&
      other.primaryMuscles.some(muscle => exercise.primaryMuscles.includes(muscle)),
  );
  const owned = candidates.filter(candidate => candidate.equipment.every(item => equipment.includes(item)));
  const others = candidates.filter(candidate => !owned.includes(candidate));
  const picks = pickPair(owned);
  const remaining = MAX_SUBSTITUTIONS - picks.length;
  return [...picks, ...pickPair(others).slice(0, remaining)].map(pick => pick.id);
}

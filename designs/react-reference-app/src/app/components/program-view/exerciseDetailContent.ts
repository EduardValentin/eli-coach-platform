import { createContext, useContext } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import type { Target } from './targets';

export type ExerciseDetailContent = {
  exercise: Exercise;
  targets: readonly Target[];
  cues: string;
  swaps: readonly Exercise[];
  swapContext: string;
  progression: string;
};

type ExerciseDetailInput = Pick<ExerciseDetailContent, 'targets'> & Partial<Pick<ExerciseDetailContent, 'cues' | 'swaps' | 'swapContext' | 'progression'>>;

function isShownExercise(exercise: Exercise | undefined): exercise is Exercise {
  return exercise !== undefined && exercise.archivedAt === undefined;
}

export function exerciseDetailOf(exercise: Exercise | undefined, input: ExerciseDetailInput): ExerciseDetailContent | null {
  if (!isShownExercise(exercise)) return null;
  return { cues: '', swaps: [], swapContext: '', progression: '', ...input, exercise };
}

type OpenExerciseDetail = (detail: ExerciseDetailContent, opener: HTMLElement, swap?: Exercise) => void;

export const ExerciseDetailContext = createContext<OpenExerciseDetail>(() => {});

export function useOpenExerciseDetail(): OpenExerciseDetail {
  return useContext(ExerciseDetailContext);
}

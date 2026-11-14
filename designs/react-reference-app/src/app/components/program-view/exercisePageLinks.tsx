import { createContext, useContext, type ReactNode } from 'react';
import { clientExercisePath } from '../../utils/exerciseLinks';

type ExercisePageHref = (exerciseId: string) => string | null;

const ExercisePageHrefContext = createContext<ExercisePageHref>(clientExercisePath);

const noExercisePage: ExercisePageHref = () => null;

export function WithoutExercisePageLinks({ children }: { children: ReactNode }) {
  return <ExercisePageHrefContext.Provider value={noExercisePage}>{children}</ExercisePageHrefContext.Provider>;
}

export function useExercisePageHref(): ExercisePageHref {
  return useContext(ExercisePageHrefContext);
}

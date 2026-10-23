import { usePrograms } from '../context/ProgramContext';
import { exerciseUsage, type LibraryUsage } from '../domain/libraryLifecycle';

export function useExerciseUsage(): (exerciseId: string) => LibraryUsage {
  const { exerciseConsumers } = usePrograms();
  const consumers = exerciseConsumers();
  return exerciseId => exerciseUsage(exerciseId, consumers);
}

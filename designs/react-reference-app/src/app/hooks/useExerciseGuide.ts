import { useMemo } from 'react';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { usePrograms } from '../context/ProgramContext';
import { useTraining } from '../context/TrainingContext';
import { exerciseGuide, type ExerciseGuide } from '../domain/exerciseGuide';
import { currentVersion } from '../domain/program';

export function useExerciseGuide(exerciseId: string): ExerciseGuide | null {
  const { exercises } = useTraining();
  const { programFor } = usePrograms();
  const { demoJourney } = useClientJourneys();
  const program = programFor(demoJourney.callId);
  const version = program && currentVersion(program);

  return useMemo(() => exerciseGuide({ exerciseId, library: exercises, version }), [exerciseId, exercises, version]);
}

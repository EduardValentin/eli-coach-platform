import { Activity } from 'lucide-react';
import { ActiveExerciseCard } from './ActiveExerciseCard';
import type { Exercise, PlanExercise, ExerciseLog } from '../../context/TrainingContext';

interface ActiveSupersetGroupProps {
  exercises: {
    exercise: Exercise;
    planExercise: PlanExercise;
    exerciseLog: ExerciseLog;
    exerciseLogIndex: number;
    number: number;
  }[];
  allExercises: Exercise[];
  onLogSet: (exerciseLogIndex: number, setNumber: number, weight: number, reps: number) => void;
  onSetComplete: (exerciseLogIndex: number, setNumber: number) => void;
  onAddSet: (exerciseLogIndex: number) => void;
  onVideoPress: (exercise: Exercise) => void;
  onSwapPress: (exerciseLogIndex: number) => void;
}

export function ActiveSupersetGroup({
  exercises, allExercises, onLogSet, onSetComplete, onAddSet, onVideoPress, onSwapPress
}: ActiveSupersetGroupProps) {
  // Build the alternation sequence: A1, B1, A2, B2...
  const maxSets = Math.max(...exercises.map(e => e.exerciseLog.sets.length));
  const sequence: { exerciseIdx: number; setNumber: number }[] = [];
  for (let setNum = 1; setNum <= maxSets; setNum++) {
    for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
      if (setNum <= exercises[exIdx].exerciseLog.sets.length) {
        sequence.push({ exerciseIdx: exIdx, setNumber: setNum });
      }
    }
  }

  // Find current step (first incomplete set in the sequence)
  const currentStepIdx = sequence.findIndex(step => {
    const exLog = exercises[step.exerciseIdx].exerciseLog;
    const setLog = exLog.sets.find(s => s.setNumber === step.setNumber);
    return setLog && !setLog.completed;
  });

  const completedSteps = currentStepIdx === -1 ? sequence.length : currentStepIdx;
  const totalSteps = sequence.length;
  const allComplete = completedSteps === totalSteps;

  // Current position label
  const currentLabel = currentStepIdx >= 0
    ? (() => {
        const step = sequence[currentStepIdx];
        const letter = String.fromCharCode(65 + step.exerciseIdx);
        return `${letter}${step.setNumber}`;
      })()
    : null;

  return (
    <div className={`border-2 rounded-2xl p-4 space-y-3 transition-colors ${
      allComplete ? 'border-brand-secondary/30 bg-brand-secondary/[0.02]' : 'border-brand-secondary/20 bg-brand-secondary/5'
    }`}>
      <div className="flex items-center justify-between">
        <div className="text-xs lg:text-sm font-bold uppercase tracking-wider text-brand-secondary flex items-center gap-2">
          <Activity size={14} className="lg:size-4" aria-hidden="true" /> Superset
        </div>
        <div className="flex items-center gap-2">
          {currentLabel && (
            <span className="text-[10px] lg:text-xs font-bold bg-brand-secondary text-white rounded-full px-2 py-0.5">
              Now: {currentLabel}
            </span>
          )}
          <span className="text-[10px] lg:text-xs font-medium text-brand-secondary/60">
            {completedSteps}/{totalSteps}
          </span>
        </div>
      </div>

      {exercises.map(({ exercise, planExercise, exerciseLog, exerciseLogIndex, number }) => (
        <ActiveExerciseCard
          key={planExercise.id}
          number={number}
          exercise={exercise}
          planExercise={planExercise}
          exerciseLog={exerciseLog}
          exerciseLogIndex={exerciseLogIndex}
          allExercises={allExercises}
          onLogSet={onLogSet}
          onSetComplete={onSetComplete}
          onAddSet={onAddSet}
          onVideoPress={onVideoPress}
          onSwapPress={onSwapPress}
        />
      ))}
    </div>
  );
}

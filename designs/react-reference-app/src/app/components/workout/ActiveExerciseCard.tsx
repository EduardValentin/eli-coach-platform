import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Info, ArrowLeftRight, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { Exercise, PlanExercise, ExerciseLog } from '../../context/TrainingContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { weightUnitLabel, displayWeightValue, fromDisplayWeight, type WeightUnit } from '../../utils/units';
import { RirBadge } from './RirBadge';

interface ActiveExerciseCardProps {
  number: number;
  exercise: Exercise;
  planExercise: PlanExercise;
  exerciseLog: ExerciseLog;
  exerciseLogIndex: number;
  allExercises: Exercise[];
  onLogSet: (exerciseLogIndex: number, setNumber: number, weight: number, reps: number) => void;
  onSetComplete: (exerciseLogIndex: number, setNumber: number) => void;
  onAddSet: (exerciseLogIndex: number) => void;
  onVideoPress: (exercise: Exercise) => void;
  onSwapPress: (exerciseLogIndex: number) => void;
}

export function ActiveExerciseCard({
  number, exercise, planExercise, exerciseLog, exerciseLogIndex,
  onLogSet, onSetComplete, onAddSet, onVideoPress, onSwapPress
}: ActiveExerciseCardProps) {
  const [expandedSets, setExpandedSets] = useState(true);
  const { weightUnit } = useUnitPreferences();
  const hasSwaps = planExercise.swapVariants && planExercise.swapVariants.length > 0;
  const completedSets = exerciseLog.sets.filter(s => s.completed).length;
  const totalSets = exerciseLog.sets.length;
  const isComplete = completedSets === totalSets;

  return (
    <div className={`bg-white rounded-2xl border transition-colors ${isComplete ? 'border-brand-secondary/30 bg-brand-secondary/[0.02]' : 'border-neutral-200'}`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-sm lg:text-base font-bold shrink-0 ${
            isComplete ? 'bg-brand-secondary text-white' : 'bg-text-primary text-white'
          }`}>
            {isComplete ? <Check size={16} className="lg:size-5" /> : number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base lg:text-lg font-semibold text-text-primary leading-tight">{exercise.name}</h3>
              {exerciseLog.wasSwapped && (
                <span className="text-[9px] lg:text-[10px] bg-brand-secondary/10 text-brand-secondary rounded-full px-1.5 py-0.5 font-bold uppercase">Swapped</span>
              )}
            </div>
            <div className="flex gap-1 mt-1.5 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {exercise.equipment.map(eq => (
                <span key={eq} className="shrink-0 text-[10px] lg:text-xs bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5">{eq}</span>
              ))}
              {exercise.primaryMuscles.map(m => (
                <span key={m} className="shrink-0 text-[10px] lg:text-xs bg-brand-secondary/10 text-brand-secondary rounded-full px-2 py-0.5">{m}</span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasSwaps && (
              <button
                onClick={() => onSwapPress(exerciseLogIndex)}
                aria-label={`Swap ${exercise.name}`}
                className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <ArrowLeftRight size={16} className="text-brand-secondary lg:size-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onVideoPress(exercise)}
              aria-label={`${exercise.name} details`}
              title="Exercise details"
              className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <Info size={16} className="text-brand lg:size-5" />
            </button>
          </div>
        </div>

        {/* Rest between sets */}
        {planExercise.restSeconds && (
          <div className="mt-3 px-1">
            <span className="text-xs lg:text-sm text-neutral-500">
              <span className="text-neutral-400">Rest </span>
              <span className="font-semibold text-text-primary tabular-nums">{formatRestTime(planExercise.restSeconds)}</span>
            </span>
          </div>
        )}

        {/* Coach notes */}
        {planExercise.notes && (
          <div className="mt-3 bg-brand-secondary/5 border-l-2 border-brand-secondary p-2.5 rounded-r-lg">
            <p className="text-xs lg:text-sm italic text-neutral-600">{planExercise.notes}</p>
          </div>
        )}
      </div>

      {/* Toggle sets */}
      <button
        onClick={() => setExpandedSets(!expandedSets)}
        className="w-full px-4 py-2 flex items-center justify-between border-t border-neutral-100 text-xs lg:text-sm font-medium text-neutral-600 hover:text-neutral-600 transition-colors"
      >
        <span>{completedSets}/{totalSets} sets completed</span>
        {expandedSets ? <ChevronUp size={14} className="lg:size-4" /> : <ChevronDown size={14} className="lg:size-4" />}
      </button>

      {/* Set rows */}
      {expandedSets && (
        <div className="px-4 pb-4 space-y-2">
          {/* Column headers */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 pt-1 text-[9px] lg:text-[11px] font-bold uppercase tracking-wider text-neutral-600">
            <span className="w-5 text-center shrink-0">Set</span>
            <span className="flex-1 min-w-0">Target</span>
            <span className="w-10 text-center shrink-0">RIR</span>
            <span className="w-14 lg:w-16 text-center shrink-0">{weightUnitLabel(weightUnit)}</span>
            <span className="w-12 lg:w-14 text-center shrink-0">reps</span>
            <span className="w-9 lg:w-10 shrink-0" aria-hidden="true" />
          </div>

          {exerciseLog.sets.map(setLog => (
            <SetRow
              key={setLog.setNumber}
              setLog={setLog}
              prescribedReps={planExercise.reps}
              rir={planExercise.rir}
              weightUnit={weightUnit}
              exerciseLogIndex={exerciseLogIndex}
              onLogSet={onLogSet}
              onSetComplete={onSetComplete}
            />
          ))}
          <button
            type="button"
            onClick={() => onAddSet(exerciseLogIndex)}
            className="w-full flex items-center justify-center gap-1.5 min-h-11 mt-1 rounded-xl border border-dashed border-neutral-200 text-neutral-500 text-xs lg:text-sm font-semibold hover:border-brand/40 hover:text-brand hover:bg-brand/[0.03] transition-colors"
          >
            <Plus size={14} className="lg:size-4" aria-hidden="true" />
            Add set
          </button>
        </div>
      )}
    </div>
  );
}

function formatRestTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Set Row sub-component ──────────────────────────────────────

interface SetRowProps {
  setLog: {
    setNumber: number;
    prescribedReps: string;
    actualWeight?: number;
    actualReps?: number;
    completed: boolean;
    isExtra?: boolean;
  };
  prescribedReps: string;
  rir: number;
  weightUnit: WeightUnit;
  exerciseLogIndex: number;
  onLogSet: (exerciseLogIndex: number, setNumber: number, weight: number, reps: number) => void;
  onSetComplete: (exerciseLogIndex: number, setNumber: number) => void;
}

function SetRow({ setLog, prescribedReps, rir, weightUnit, exerciseLogIndex, onLogSet, onSetComplete }: SetRowProps) {
  const [weight, setWeight] = useState(setLog.actualWeight?.toString() || '');
  const [reps, setReps] = useState(setLog.actualReps?.toString() || '');

  const handleComplete = useCallback(() => {
    // Inputs are in the client's display unit; store canonical kilograms.
    const w = fromDisplayWeight(parseFloat(weight) || 0, weightUnit);
    const r = parseInt(reps) || 0;
    onLogSet(exerciseLogIndex, setLog.setNumber, w, r);
    onSetComplete(exerciseLogIndex, setLog.setNumber);
  }, [weight, reps, weightUnit, exerciseLogIndex, setLog.setNumber, onLogSet, onSetComplete]);

  // Determine if reps differ from prescribed for diff highlighting
  const actualRepsNum = setLog.actualReps;
  const prescribedNum = parseInt(prescribedReps);
  const hasDiff = setLog.completed && actualRepsNum != null && !isNaN(prescribedNum) && actualRepsNum !== prescribedNum;
  const isUnder = hasDiff && actualRepsNum != null && actualRepsNum < prescribedNum;
  const isOver = hasDiff && actualRepsNum != null && actualRepsNum > prescribedNum;

  return (
    <motion.div
      layout
      className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl transition-colors ${
        setLog.completed
          ? isUnder ? 'bg-brand/5' : isOver ? 'bg-brand-secondary/5' : 'bg-neutral-50'
          : 'bg-neutral-50'
      }`}
    >
      {/* Set number */}
      <span className={`text-xs lg:text-sm font-bold w-5 text-center shrink-0 ${
        setLog.completed ? 'text-brand-secondary' : 'text-neutral-400'
      }`}>
        {setLog.setNumber}
      </span>

      {/* Target */}
      <div className="flex-1 min-w-0">
        <span className="text-xs lg:text-sm font-semibold text-text-primary tabular-nums whitespace-nowrap block truncate">
          {prescribedReps}
        </span>
      </div>

      {/* RIR column */}
      <div className="w-10 shrink-0 flex justify-center">
        <RirBadge value={rir} />
      </div>

      {/* Weight input */}
      <div className="w-14 lg:w-16">
        <input
          type="number"
          inputMode="decimal"
          placeholder={weightUnitLabel(weightUnit)}
          value={setLog.completed ? (setLog.actualWeight != null ? displayWeightValue(setLog.actualWeight, weightUnit) : '') : weight}
          onChange={(e) => setWeight(e.target.value)}
          disabled={setLog.completed}
          className="w-full text-center text-sm lg:text-base font-medium bg-white border border-neutral-200 rounded-lg py-1.5 lg:py-2 px-1 focus:outline-none focus:border-brand disabled:opacity-60 disabled:bg-neutral-50"
        />
      </div>

      {/* Reps input */}
      <div className="w-12 lg:w-14">
        <input
          type="number"
          inputMode="numeric"
          placeholder="reps"
          value={setLog.completed ? (setLog.actualReps || '') : reps}
          onChange={(e) => setReps(e.target.value)}
          disabled={setLog.completed}
          className="w-full text-center text-sm lg:text-base font-medium bg-white border border-neutral-200 rounded-lg py-1.5 lg:py-2 px-1 focus:outline-none focus:border-brand disabled:opacity-60 disabled:bg-neutral-50"
        />
      </div>

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={setLog.completed}
        aria-label={setLog.completed ? `Set ${setLog.setNumber} logged` : `Log set ${setLog.setNumber}`}
        className={`w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-full shrink-0 transition-all ${
          setLog.completed
            ? 'bg-brand-secondary text-white'
            : 'bg-neutral-200 text-neutral-400 hover:bg-brand hover:text-white'
        }`}
      >
        <Check size={16} className="lg:size-5" />
      </button>
    </motion.div>
  );
}

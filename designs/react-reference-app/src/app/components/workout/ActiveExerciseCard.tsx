import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { PlayCircle, ArrowLeftRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { Exercise, PlanExercise, ExerciseLog } from '../../context/TrainingContext';

interface ActiveExerciseCardProps {
  number: number;
  exercise: Exercise;
  planExercise: PlanExercise;
  exerciseLog: ExerciseLog;
  exerciseLogIndex: number;
  allExercises: Exercise[];
  onLogSet: (exerciseLogIndex: number, setNumber: number, weight: number, reps: number) => void;
  onSetComplete: (exerciseLogIndex: number, setNumber: number) => void;
  onVideoPress: (exercise: Exercise) => void;
  onSwapPress: (exerciseLogIndex: number) => void;
}

export function ActiveExerciseCard({
  number, exercise, planExercise, exerciseLog, exerciseLogIndex,
  onLogSet, onSetComplete, onVideoPress, onSwapPress
}: ActiveExerciseCardProps) {
  const [expandedSets, setExpandedSets] = useState(true);
  const hasSwaps = planExercise.swapVariants && planExercise.swapVariants.length > 0;
  const completedSets = exerciseLog.sets.filter(s => s.completed).length;
  const totalSets = exerciseLog.sets.length;
  const isComplete = completedSets === totalSets;

  return (
    <div className={`bg-white rounded-2xl border transition-colors ${isComplete ? 'border-[#00796B]/30 bg-[#00796B]/[0.02]' : 'border-neutral-200'}`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            isComplete ? 'bg-[#00796B] text-white' : 'bg-[#121212] text-white'
          }`}>
            {isComplete ? <Check size={16} /> : number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#121212] leading-tight">{exercise.name}</h3>
              {exerciseLog.wasSwapped && (
                <span className="text-[9px] bg-[#00796B]/10 text-[#00796B] rounded-full px-1.5 py-0.5 font-bold uppercase">Swapped</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {exercise.equipment.map(eq => (
                <span key={eq} className="text-[10px] bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5">{eq}</span>
              ))}
              {exercise.primaryMuscles.map(m => (
                <span key={m} className="text-[10px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5">{m}</span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasSwaps && (
              <button
                onClick={() => onSwapPress(exerciseLogIndex)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <ArrowLeftRight size={16} className="text-[#00796B]" />
              </button>
            )}
            {exercise.videoUrl && (
              <button
                onClick={() => onVideoPress(exercise)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <PlayCircle size={16} className="text-[#C81D6B]" />
              </button>
            )}
          </div>
        </div>

        {/* Target summary */}
        <div className="flex items-center gap-3 mt-3 px-1">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
            {planExercise.sets} sets
          </span>
          <span className="text-[10px] text-neutral-300">&middot;</span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
            {planExercise.reps} reps
          </span>
          <span className="text-[10px] text-neutral-300">&middot;</span>
          <span className="text-[10px] uppercase tracking-widest text-[#C81D6B] font-bold">
            RIR {planExercise.rir}
          </span>
          {planExercise.restSeconds && (
            <>
              <span className="text-[10px] text-neutral-300">&middot;</span>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                {planExercise.restSeconds}s rest
              </span>
            </>
          )}
        </div>

        {/* Coach notes */}
        {planExercise.notes && (
          <div className="mt-3 bg-[#00796B]/5 border-l-2 border-[#00796B] p-2.5 rounded-r-lg">
            <p className="text-xs italic text-neutral-600">{planExercise.notes}</p>
          </div>
        )}
      </div>

      {/* Toggle sets */}
      <button
        onClick={() => setExpandedSets(!expandedSets)}
        className="w-full px-4 py-2 flex items-center justify-between border-t border-neutral-100 text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <span>{completedSets}/{totalSets} sets completed</span>
        {expandedSets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Set rows */}
      {expandedSets && (
        <div className="px-4 pb-4 space-y-2">
          {exerciseLog.sets.map(setLog => (
            <SetRow
              key={setLog.setNumber}
              setLog={setLog}
              prescribedReps={planExercise.reps}
              rir={planExercise.rir}
              exerciseLogIndex={exerciseLogIndex}
              onLogSet={onLogSet}
              onSetComplete={onSetComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Set Row sub-component ──────────────────────────────────────

interface SetRowProps {
  setLog: {
    setNumber: number;
    prescribedReps: string;
    actualWeight?: number;
    actualReps?: number;
    completed: boolean;
  };
  prescribedReps: string;
  rir: number;
  exerciseLogIndex: number;
  onLogSet: (exerciseLogIndex: number, setNumber: number, weight: number, reps: number) => void;
  onSetComplete: (exerciseLogIndex: number, setNumber: number) => void;
}

function SetRow({ setLog, prescribedReps, rir, exerciseLogIndex, onLogSet, onSetComplete }: SetRowProps) {
  const [weight, setWeight] = useState(setLog.actualWeight?.toString() || '');
  const [reps, setReps] = useState(setLog.actualReps?.toString() || '');

  const handleComplete = useCallback(() => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    onLogSet(exerciseLogIndex, setLog.setNumber, w, r);
    onSetComplete(exerciseLogIndex, setLog.setNumber);
  }, [weight, reps, exerciseLogIndex, setLog.setNumber, onLogSet, onSetComplete]);

  // Determine if reps differ from prescribed for diff highlighting
  const actualRepsNum = setLog.actualReps;
  const prescribedNum = parseInt(prescribedReps);
  const hasDiff = setLog.completed && actualRepsNum != null && !isNaN(prescribedNum) && actualRepsNum !== prescribedNum;
  const isUnder = hasDiff && actualRepsNum != null && actualRepsNum < prescribedNum;
  const isOver = hasDiff && actualRepsNum != null && actualRepsNum > prescribedNum;

  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        setLog.completed
          ? isUnder ? 'bg-[#C81D6B]/5' : isOver ? 'bg-[#00796B]/5' : 'bg-neutral-50'
          : 'bg-neutral-50'
      }`}
    >
      {/* Set number */}
      <span className={`text-xs font-bold w-5 text-center shrink-0 ${
        setLog.completed ? 'text-[#00796B]' : 'text-neutral-400'
      }`}>
        {setLog.setNumber}
      </span>

      {/* Target */}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-neutral-400 font-medium">
          Target: {prescribedReps} @ RIR {rir}
        </span>
      </div>

      {/* Weight input */}
      <div className="w-16">
        <input
          type="number"
          inputMode="decimal"
          placeholder="kg"
          value={setLog.completed ? (setLog.actualWeight || '') : weight}
          onChange={(e) => setWeight(e.target.value)}
          disabled={setLog.completed}
          className="w-full text-center text-sm font-medium bg-white border border-neutral-200 rounded-lg py-1.5 px-1 focus:outline-none focus:border-[#C81D6B] disabled:opacity-60 disabled:bg-neutral-50"
        />
      </div>

      {/* Reps input */}
      <div className="w-14">
        <input
          type="number"
          inputMode="numeric"
          placeholder="reps"
          value={setLog.completed ? (setLog.actualReps || '') : reps}
          onChange={(e) => setReps(e.target.value)}
          disabled={setLog.completed}
          className="w-full text-center text-sm font-medium bg-white border border-neutral-200 rounded-lg py-1.5 px-1 focus:outline-none focus:border-[#C81D6B] disabled:opacity-60 disabled:bg-neutral-50"
        />
      </div>

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={setLog.completed}
        className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-all ${
          setLog.completed
            ? 'bg-[#00796B] text-white'
            : 'bg-neutral-200 text-neutral-400 hover:bg-[#C81D6B] hover:text-white'
        }`}
      >
        <Check size={16} />
      </button>
    </motion.div>
  );
}

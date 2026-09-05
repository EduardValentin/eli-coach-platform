import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTraining } from '../../context/TrainingContext';
import type { Exercise } from '../../context/TrainingContext';
import { ArrowLeft, ArrowLeftRight, Activity, Trophy, Dumbbell, Clock, Flame, ArrowRight, AlertTriangle, MoreVertical, Flag } from 'lucide-react';
import { motion } from 'motion/react';
import { ActiveExerciseCard } from '../../components/workout/ActiveExerciseCard';
import { ActiveSupersetGroup } from '../../components/workout/ActiveSupersetGroup';
import { RestTimer } from '../../components/workout/RestTimer';
import { VideoSheet } from '../../components/workout/VideoSheet';
import { SwapSheet } from '../../components/workout/SwapSheet';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction
} from '../../components/ui/alert-dialog';
import { BottomSheet } from '../../components/ui/bottom-sheet';
import { RirBadge } from '../../components/workout/RirBadge';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { displayWeightValue, weightUnitLabel } from '../../utils/units';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WorkoutViewer() {
  const { planId, weekIdx: weekIdxParam, dayIdx: dayIdxParam } = useParams();
  const navigate = useNavigate();
  const {
    planInstances, exercises,
    activeWorkout, startWorkout, logSet, addExtraSet, swapExercise,
    recordRestTime, completeWorkout
  } = useTraining();

  const weekIdx = parseInt(weekIdxParam ?? '0', 10);
  const dayIdx = parseInt(dayIdxParam ?? '0', 10);

  const plan = planInstances.find(p => p.id === planId);
  const week = plan?.weeks[weekIdx];
  const day = week?.days[dayIdx];

  // Start or resume workout on mount
  useEffect(() => {
    if (plan && day && day.exercises.length > 0 && !activeWorkout) {
      startWorkout(plan.id, weekIdx, dayIdx);
    }
  }, [plan, day, weekIdx, dayIdx, activeWorkout, startWorkout]);

  // Timer state
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerExerciseIdx, setTimerExerciseIdx] = useState(0);
  const [timerSetIdx, setTimerSetIdx] = useState(0);

  // Sheet state
  const [videoExercise, setVideoExercise] = useState<Exercise | null>(null);
  const [swapExerciseIdx, setSwapExerciseIdx] = useState<number | null>(null);

  // Group exercises (same logic as before)
  const groupedExercises = useMemo(() => {
    if (!day) return [];
    const groups: { isSuperset: boolean; id: string; items: typeof day.exercises }[] = [];
    const processedIds = new Set<string>();
    day.exercises.forEach(pe => {
      if (processedIds.has(pe.id)) return;
      if (pe.supersetId) {
        const ssItems = day.exercises.filter(e => e.supersetId === pe.supersetId);
        groups.push({ isSuperset: true, id: pe.supersetId, items: ssItems });
        ssItems.forEach(i => processedIds.add(i.id));
      } else {
        groups.push({ isSuperset: false, id: pe.id, items: [pe] });
        processedIds.add(pe.id);
      }
    });
    return groups;
  }, [day]);

  // Progress calculation
  const totalSets = activeWorkout?.exercises.reduce((t, e) => t + e.sets.length, 0) || 0;
  const completedSets = activeWorkout?.exercises.reduce((t, e) => t + e.sets.filter(s => s.completed).length, 0) || 0;
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const allSetsComplete = completedSets === totalSets && totalSets > 0;
  const isCompleted = activeWorkout?.status === 'completed';

  // Handlers
  const handleSetComplete = useCallback((exerciseLogIndex: number, setNumber: number) => {
    if (!activeWorkout || !day) return;
    const pe = day.exercises[exerciseLogIndex];
    const restSec = pe?.restSeconds || 90;
    setTimerSeconds(restSec);
    setTimerExerciseIdx(exerciseLogIndex);
    setTimerSetIdx(setNumber);
    setShowTimer(true);
  }, [activeWorkout, day]);

  const handleTimerComplete = useCallback((actualSeconds: number) => {
    recordRestTime(timerExerciseIdx, timerSetIdx, actualSeconds);
    setShowTimer(false);
  }, [recordRestTime, timerExerciseIdx, timerSetIdx]);

  const handleTimerSkip = useCallback((actualSeconds: number) => {
    recordRestTime(timerExerciseIdx, timerSetIdx, actualSeconds);
    setShowTimer(false);
  }, [recordRestTime, timerExerciseIdx, timerSetIdx]);

  const handleVideoPress = useCallback((ex: Exercise) => {
    setVideoExercise(ex);
  }, []);

  const handleSwapPress = useCallback((exerciseLogIndex: number) => {
    setSwapExerciseIdx(exerciseLogIndex);
  }, []);

  const handleSwap = useCallback((newExerciseId: string) => {
    if (swapExerciseIdx !== null) {
      swapExercise(swapExerciseIdx, newExerciseId);
    }
  }, [swapExercise, swapExerciseIdx]);

  // Incomplete workout confirmation
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const handleCompletePress = useCallback(() => {
    if (allSetsComplete) {
      completeWorkout();
    } else {
      setShowIncompleteDialog(true);
    }
  }, [allSetsComplete, completeWorkout]);

  const handleConfirmIncomplete = useCallback(() => {
    setShowIncompleteDialog(false);
    completeWorkout();
  }, [completeWorkout]);

  // Error state
  if (!plan || !week || !day) {
    return (
      <div className="fixed inset-0 bg-surface-page flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <Activity size={28} className="text-text-secondary" />
        </div>
        <h2 className="text-xl font-serif font-bold text-text-primary mb-2">Workout Not Found</h2>
        <p className="text-text-secondary text-sm mb-6 max-w-xs">
          We couldn't find this workout. It may have been removed or the link is incorrect.
        </p>
        <button
          onClick={() => navigate('/portal/plan')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-text-primary text-white text-sm font-semibold rounded-xl"
        >
          <ArrowLeft size={16} />
          Back to Plan
        </button>
      </div>
    );
  }

  // ── Summary view ────────────────────────────────────────────
  if (isCompleted && activeWorkout) {
    return <WorkoutSummary workout={activeWorkout} exercises={exercises} day={day} week={week} navigate={navigate} />;
  }

  // ── Active workout view ─────────────────────────────────────
  let exerciseCounter = 0;

  return (
    <div className="fixed inset-0 bg-surface-page flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 h-14 lg:h-16 bg-white border-b border-neutral-200 rounded-md flex items-center justify-between gap-2 px-4">
        <button
          type="button"
          onClick={() => navigate('/portal/plan')}
          aria-label="Back to plan"
          className="w-9 h-9 lg:w-11 lg:h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-text-primary lg:size-6" />
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 text-center">
          <span className="text-sm lg:text-base font-semibold text-text-primary truncate">
            {DAY_NAMES[day.dayOfWeek]} &mdash; {day.type}
          </span>
          <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider bg-brand/10 text-brand px-2 py-1 rounded-full shrink-0">
            W{week.order}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOptionsOpen(true)}
          aria-label="Workout options"
          aria-haspopup="dialog"
          aria-expanded={optionsOpen}
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <MoreVertical size={22} className="text-text-primary lg:size-6" />
        </button>
      </div>

      <BottomSheet open={optionsOpen} onOpenChange={setOptionsOpen} title="Workout options">
        <div className="px-3 pb-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setOptionsOpen(false);
              handleCompletePress();
            }}
            className="w-full flex items-center gap-4 px-4 min-h-14 rounded-2xl text-left text-base font-medium text-text-primary hover:bg-neutral-50 transition-colors"
          >
            <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-brand/10">
              <Flag size={20} className="text-brand" />
            </span>
            <span className="flex-1">End workout</span>
          </button>
        </div>
        <div className="px-4 pt-2 pb-4 border-t border-neutral-100 mt-1">
          <button
            type="button"
            onClick={() => setOptionsOpen(false)}
            className="w-full min-h-12 rounded-2xl text-sm font-semibold text-text-secondary hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>

      {/* Progress */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3">
        <span className="text-xs lg:text-sm font-medium text-text-secondary">
          {completedSets}/{totalSets} sets
        </span>
        <div className="flex-1 h-1.5 lg:h-2 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs lg:text-sm font-medium text-brand">{Math.round(progressPercent)}%</span>
      </div>

      {/* Scrollable exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {groupedExercises.map((group, gIdx) => {
          if (group.isSuperset && activeWorkout) {
            const ssExercises = group.items.map(pe => {
              exerciseCounter++;
              const logIdx = day.exercises.findIndex(e => e.id === pe.id);
              const exLog = activeWorkout.exercises[logIdx];
              const ex = exercises.find(e => e.id === (exLog?.exerciseId || pe.exerciseId));
              return {
                exercise: ex!,
                planExercise: pe,
                exerciseLog: exLog,
                exerciseLogIndex: logIdx,
                number: exerciseCounter,
              };
            }).filter(e => e.exercise && e.exerciseLog);

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gIdx * 0.07, duration: 0.35 }}
              >
                <ActiveSupersetGroup
                  exercises={ssExercises}
                  allExercises={exercises}
                  onLogSet={logSet}
                  onSetComplete={handleSetComplete}
                  onAddSet={addExtraSet}
                  onVideoPress={handleVideoPress}
                  onSwapPress={handleSwapPress}
                />
              </motion.div>
            );
          }

          const pe = group.items[0];
          exerciseCounter++;
          const logIdx = day.exercises.findIndex(e => e.id === pe.id);
          const exLog = activeWorkout?.exercises[logIdx];
          const ex = exercises.find(e => e.id === (exLog?.exerciseId || pe.exerciseId));
          if (!ex || !exLog) return null;

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gIdx * 0.07, duration: 0.35 }}
            >
              <ActiveExerciseCard
                number={exerciseCounter}
                exercise={ex}
                planExercise={pe}
                exerciseLog={exLog}
                exerciseLogIndex={logIdx}
                allExercises={exercises}
                onLogSet={logSet}
                onSetComplete={handleSetComplete}
                onAddSet={addExtraSet}
                onVideoPress={handleVideoPress}
                onSwapPress={handleSwapPress}
              />
            </motion.div>
          );
        })}

        {/* Complete button — only appears once every set has been logged.
            To finish early, use "End workout" in the top-bar options menu. */}
        {allSetsComplete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="pt-4"
          >
            <button
              type="button"
              onClick={handleCompletePress}
              className="w-full py-4 lg:py-5 font-semibold rounded-2xl text-base lg:text-lg flex items-center justify-center gap-2 bg-brand text-white hover:bg-brand-hover transition-colors"
            >
              <Trophy size={20} className="lg:size-6" aria-hidden="true" />
              Complete Workout
            </button>
          </motion.div>
        )}
      </div>

      {/* Incomplete workout confirmation dialog */}
      <IncompleteWorkoutDialog
        open={showIncompleteDialog}
        onOpenChange={setShowIncompleteDialog}
        onConfirm={handleConfirmIncomplete}
        completedSets={completedSets}
        totalSets={totalSets}
        activeWorkout={activeWorkout}
        exercises={exercises}
      />

      {/* Rest Timer overlay */}
      {showTimer && (
        <RestTimer
          initialSeconds={timerSeconds}
          onComplete={handleTimerComplete}
          onSkip={handleTimerSkip}
        />
      )}

      {/* Video Sheet */}
      {videoExercise && (
        <VideoSheet
          exercise={videoExercise}
          open={!!videoExercise}
          onOpenChange={(open) => !open && setVideoExercise(null)}
        />
      )}

      {/* Swap Sheet */}
      {swapExerciseIdx !== null && activeWorkout && day && (() => {
        const pe = day.exercises[swapExerciseIdx];
        const exLog = activeWorkout.exercises[swapExerciseIdx];
        if (!pe?.swapVariants?.length || !exLog) return null;
        const originalEx = exercises.find(e => e.id === exLog.originalExerciseId);
        const variantExercises = pe.swapVariants
          .map(id => exercises.find(e => e.id === id))
          .filter((e): e is NonNullable<typeof e> => !!e);
        if (!originalEx) return null;
        return (
          <SwapSheet
            currentExerciseId={exLog.exerciseId}
            variants={variantExercises}
            originalExercise={originalEx}
            open={true}
            onOpenChange={(open) => !open && setSwapExerciseIdx(null)}
            onSwap={handleSwap}
          />
        );
      })()}
    </div>
  );
}

// ── Workout Summary sub-component ──────────────────────────────

function WorkoutSummary({ workout, exercises: allExercises, day, week, navigate }: {
  workout: NonNullable<ReturnType<typeof useTraining>['activeWorkout']>;
  exercises: Exercise[];
  day: { dayOfWeek: number; type: string; exercises: { id: string; exerciseId: string; sets: number; reps: string; rir: number }[] };
  week: { order: number };
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { weightUnit } = useUnitPreferences();
  if (!workout) return null;

  const durationMin = workout.duration ? Math.round(workout.duration / 60) : 0;
  const totalVolume = workout.totalVolume || 0;

  // Collect muscle groups
  const muscleGroups: Record<string, number> = {};
  workout.exercises.forEach(exLog => {
    const ex = allExercises.find(e => e.id === exLog.exerciseId);
    if (ex) {
      ex.primaryMuscles.forEach(m => {
        muscleGroups[m] = (muscleGroups[m] || 0) + 1;
      });
    }
  });

  const sortedMuscles = Object.entries(muscleGroups).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 bg-surface-page flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 pt-12 pb-6 px-6 text-center bg-gradient-to-b from-brand/5 to-transparent">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 lg:w-20 lg:h-20 bg-brand rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Trophy size={28} className="text-white lg:size-9" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl lg:text-3xl font-serif font-bold text-text-primary mb-1"
        >
          Great work!
        </motion.h1>
        <p className="text-sm lg:text-base text-text-secondary">
          {DAY_NAMES[day.dayOfWeek]} &mdash; {day.type} &middot; Week {week.order}
        </p>
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-4 w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-white rounded-xl p-4 lg:p-5 text-center border border-neutral-100">
            <Clock size={18} className="text-text-secondary mx-auto mb-1.5 lg:size-6" />
            <p className="text-lg lg:text-2xl font-serif font-bold text-text-primary">{durationMin}</p>
            <p className="text-[10px] lg:text-xs uppercase tracking-widest text-text-secondary font-bold">min</p>
          </div>
          <div className="bg-white rounded-xl p-4 lg:p-5 text-center border border-neutral-100">
            <Dumbbell size={18} className="text-brand mx-auto mb-1.5 lg:size-6" />
            <p className="text-lg lg:text-2xl font-serif font-bold text-text-primary">{displayWeightValue(totalVolume, weightUnit, 0).toLocaleString()}</p>
            <p className="text-[10px] lg:text-xs uppercase tracking-widest text-text-secondary font-bold">{weightUnitLabel(weightUnit)} vol</p>
          </div>
          <div className="bg-white rounded-xl p-4 lg:p-5 text-center border border-neutral-100">
            <Flame size={18} className="text-brand-secondary mx-auto mb-1.5 lg:size-6" />
            <p className="text-lg lg:text-2xl font-serif font-bold text-text-primary">{workout.exercises.length}</p>
            <p className="text-[10px] lg:text-xs uppercase tracking-widest text-text-secondary font-bold">exercises</p>
          </div>
        </div>
      </div>

      {/* Muscle groups */}
      <div className="px-4 pb-4 w-full max-w-2xl mx-auto">
        <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">Muscles Worked</h3>
        <div className="flex flex-wrap gap-2">
          {sortedMuscles.map(([muscle, count]) => (
            <span key={muscle} className="text-xs lg:text-sm bg-brand-secondary/10 text-brand-secondary rounded-full px-3 py-1.5 font-medium">
              {muscle} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Exercise breakdown */}
      <div className="px-4 pb-8 w-full max-w-2xl mx-auto">
        <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">Exercise Breakdown</h3>
        <div className="space-y-3">
          {workout.exercises.map((exLog, i) => {
            const ex = allExercises.find(e => e.id === exLog.exerciseId);
            const originalEx = exLog.wasSwapped ? allExercises.find(e => e.id === exLog.originalExerciseId) : null;
            const planEx = day.exercises[i];
            if (!ex) return null;
            return (
              <div key={exLog.planExerciseId} className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm lg:text-base text-text-primary">{ex.name}</span>
                    <span className="text-[10px] lg:text-xs text-text-secondary inline-flex items-center gap-1.5">
                      {planEx?.sets}x{planEx?.reps}
                      {planEx?.rir != null && <RirBadge value={planEx.rir} />}
                    </span>
                  </div>
                  {exLog.wasSwapped && originalEx && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <ArrowLeftRight size={10} className="text-brand-secondary lg:size-3" />
                      <span className="text-[10px] lg:text-xs text-brand-secondary font-medium">
                        Swapped from {originalEx.name}
                      </span>
                    </div>
                  )}
                </div>
                {/* Sets */}
                <div className="border-t border-neutral-100">
                  {exLog.sets.filter(s => s.completed).map(s => {
                    const prescribedNum = parseInt(planEx?.reps || '0');
                    const repsDiff = s.actualReps != null && !isNaN(prescribedNum) ? s.actualReps - prescribedNum : null;
                    const isUnder = repsDiff !== null && repsDiff < 0;
                    const isOver = repsDiff !== null && repsDiff > 0;
                    return (
                      <div key={s.setNumber} className={`flex items-center px-4 py-2 lg:py-2.5 text-xs lg:text-sm border-t border-neutral-50 first:border-t-0 ${
                        isUnder ? 'bg-brand/[0.03]' : isOver ? 'bg-brand-secondary/[0.03]' : ''
                      }`}>
                        <span className="w-8 text-neutral-300 font-bold">{s.setNumber}</span>
                        <span className="text-text-secondary flex-1">{planEx?.reps} reps</span>
                        <span className="font-semibold text-text-primary mr-1">{s.actualWeight != null ? displayWeightValue(s.actualWeight, weightUnit) : 0}{weightUnitLabel(weightUnit)}</span>
                        <span className="text-neutral-300 mr-1">&times;</span>
                        <span className={`font-bold ${
                          isUnder ? 'text-brand' : isOver ? 'text-brand-secondary' : 'text-text-primary'
                        }`}>
                          {s.actualReps}
                        </span>
                        {repsDiff !== null && repsDiff !== 0 && (
                          <span className={`ml-2 text-[9px] lg:text-[11px] font-bold rounded-full px-1.5 py-0.5 ${
                            isUnder ? 'bg-brand/10 text-brand' : 'bg-brand-secondary/10 text-brand-secondary'
                          }`}>
                            {repsDiff > 0 ? `+${repsDiff}` : repsDiff}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      <div className="px-4 pb-10 w-full max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/portal/plan')}
          className="w-full py-3.5 lg:py-4 bg-text-primary text-white font-semibold rounded-2xl text-sm lg:text-base flex items-center justify-center gap-2"
        >
          Back to Plan
          <ArrowRight size={16} className="lg:size-5" />
        </button>
      </div>
    </div>
  );
}

// ── Incomplete Workout Dialog ──────────────────────────────────

function IncompleteWorkoutDialog({ open, onOpenChange, onConfirm, completedSets, totalSets, activeWorkout, exercises: allExercises }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  completedSets: number;
  totalSets: number;
  activeWorkout: ReturnType<typeof useTraining>['activeWorkout'];
  exercises: Exercise[];
}) {
  const { weightUnit } = useUnitPreferences();
  if (!activeWorkout) return null;

  const missingSets = totalSets - completedSets;
  const completionPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  // Compute partial stats
  const partialVolume = activeWorkout.exercises.reduce((total, ex) =>
    total + ex.sets.reduce((exTotal, s) =>
      exTotal + (s.completed && s.actualWeight && s.actualReps ? s.actualWeight * s.actualReps : 0), 0
    ), 0);

  // Muscle groups from completed exercises (at least 1 set done)
  const muscleGroups: Record<string, number> = {};
  activeWorkout.exercises.forEach(exLog => {
    const hasCompletedSet = exLog.sets.some(s => s.completed);
    if (hasCompletedSet) {
      const ex = allExercises.find(e => e.id === exLog.exerciseId);
      ex?.primaryMuscles.forEach(m => {
        muscleGroups[m] = (muscleGroups[m] || 0) + 1;
      });
    }
  });
  const sortedMuscles = Object.entries(muscleGroups).sort((a, b) => b[1] - a[1]);

  // Exercises with missing sets
  const incomplete = activeWorkout.exercises
    .map(exLog => {
      const missing = exLog.sets.filter(s => !s.completed).length;
      if (missing === 0) return null;
      const ex = allExercises.find(e => e.id === exLog.exerciseId);
      return { name: ex?.name || 'Unknown', missing, total: exLog.sets.length };
    })
    .filter(Boolean) as { name: string; missing: number; total: number }[];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Warning header */}
        <div className="bg-brand/5 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-brand" />
          </div>
          <AlertDialogHeader className="p-0 space-y-1 text-left sm:text-left">
            <AlertDialogTitle className="text-text-primary text-base">
              {missingSets} unlogged {missingSets === 1 ? 'set' : 'sets'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-text-secondary">
              You've completed {completedSets} of {totalSets} sets ({completionPercent}%).
              Finish now or go back to log the rest.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Partial stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <Dumbbell size={16} className="text-brand mx-auto mb-1" />
              <p className="text-base font-serif font-bold text-text-primary">{displayWeightValue(partialVolume, weightUnit, 0).toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">{weightUnitLabel(weightUnit)} logged</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <Flame size={16} className="text-brand-secondary mx-auto mb-1" />
              <p className="text-base font-serif font-bold text-text-primary">{sortedMuscles.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">muscle groups</p>
            </div>
          </div>

          {/* Muscle pills */}
          {sortedMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sortedMuscles.map(([muscle]) => (
                <span key={muscle} className="text-[10px] bg-brand-secondary/10 text-brand-secondary rounded-full px-2 py-0.5 font-medium">{muscle}</span>
              ))}
            </div>
          )}

          {/* Missing exercises list */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Unlogged</p>
            <div className="space-y-1.5">
              {incomplete.map(({ name, missing, total }) => (
                <div key={name} className="flex items-center justify-between text-xs bg-brand/[0.03] rounded-lg px-3 py-2">
                  <span className="font-medium text-text-primary">{name}</span>
                  <span className="text-brand font-semibold">{missing}/{total} sets</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-row gap-3 px-6 pb-6 pt-2">
          <AlertDialogCancel className="flex-1 rounded-xl border-neutral-200 text-text-primary hover:bg-neutral-50 font-semibold">
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-brand text-white hover:bg-brand-hover font-semibold"
          >
            Finish Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

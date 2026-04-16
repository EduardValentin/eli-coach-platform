import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTraining } from '../../context/TrainingContext';
import type { Exercise } from '../../context/TrainingContext';
import { ArrowLeft, ArrowLeftRight, Activity, Trophy, Dumbbell, Clock, Flame, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveExerciseCard } from '../../components/workout/ActiveExerciseCard';
import { ActiveSupersetGroup } from '../../components/workout/ActiveSupersetGroup';
import { RestTimer } from '../../components/workout/RestTimer';
import { VideoSheet } from '../../components/workout/VideoSheet';
import { SwapSheet } from '../../components/workout/SwapSheet';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction
} from '../../components/ui/alert-dialog';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WorkoutViewer() {
  const { planId, weekIdx: weekIdxParam, dayIdx: dayIdxParam } = useParams();
  const navigate = useNavigate();
  const {
    planInstances, exercises,
    activeWorkout, startWorkout, logSet, swapExercise,
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
      <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <Activity size={28} className="text-neutral-400" />
        </div>
        <h2 className="text-xl font-serif font-bold text-[#121212] mb-2">Workout Not Found</h2>
        <p className="text-neutral-500 text-sm mb-6 max-w-xs">
          We couldn't find this workout. It may have been removed or the link is incorrect.
        </p>
        <button
          onClick={() => navigate('/portal/plan')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121212] text-white text-sm font-semibold rounded-xl"
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
    <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-4">
        <button
          onClick={() => navigate('/portal/plan')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-[#121212]" />
        </button>
        <div className="flex items-center gap-2 text-center">
          <span className="text-sm font-semibold text-[#121212]">
            {DAY_NAMES[day.dayOfWeek]} &mdash; {day.type}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#C81D6B]/10 text-[#C81D6B] px-2.5 py-1 rounded-full">
          W{week.order}
        </span>
      </div>

      {/* Progress */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3">
        <span className="text-xs font-medium text-neutral-400">
          {completedSets}/{totalSets} sets
        </span>
        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#C81D6B] rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs font-medium text-[#C81D6B]">{Math.round(progressPercent)}%</span>
      </div>

      {/* Scrollable exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">
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
                onVideoPress={handleVideoPress}
                onSwapPress={handleSwapPress}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Complete button — always visible once at least 1 set is done */}
      <AnimatePresence>
        {completedSets > 0 && !showTimer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent pt-10"
          >
            <button
              onClick={handleCompletePress}
              className={`w-full py-4 font-semibold rounded-2xl text-base flex items-center justify-center gap-2 transition-colors shadow-lg ${
                allSetsComplete
                  ? 'bg-[#C81D6B] text-white hover:bg-[#B0185E]'
                  : 'bg-[#121212] text-white hover:bg-neutral-800'
              }`}
            >
              <Trophy size={20} />
              Complete Workout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
    <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 pt-12 pb-6 px-6 text-center bg-gradient-to-b from-[#C81D6B]/5 to-transparent">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 bg-[#C81D6B] rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Trophy size={28} className="text-white" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-serif font-bold text-[#121212] mb-1"
        >
          Great work!
        </motion.h1>
        <p className="text-sm text-neutral-500">
          {DAY_NAMES[day.dayOfWeek]} &mdash; {day.type} &middot; Week {week.order}
        </p>
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
            <Clock size={18} className="text-neutral-400 mx-auto mb-1.5" />
            <p className="text-lg font-serif font-bold text-[#121212]">{durationMin}</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">min</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
            <Dumbbell size={18} className="text-[#C81D6B] mx-auto mb-1.5" />
            <p className="text-lg font-serif font-bold text-[#121212]">{totalVolume.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">kg vol</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
            <Flame size={18} className="text-[#00796B] mx-auto mb-1.5" />
            <p className="text-lg font-serif font-bold text-[#121212]">{workout.exercises.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">exercises</p>
          </div>
        </div>
      </div>

      {/* Muscle groups */}
      <div className="px-4 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Muscles Worked</h3>
        <div className="flex flex-wrap gap-2">
          {sortedMuscles.map(([muscle, count]) => (
            <span key={muscle} className="text-xs bg-[#00796B]/10 text-[#00796B] rounded-full px-3 py-1.5 font-medium">
              {muscle} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Exercise breakdown */}
      <div className="px-4 pb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Exercise Breakdown</h3>
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
                    <span className="font-semibold text-sm text-[#121212]">{ex.name}</span>
                    <span className="text-[10px] text-neutral-400">
                      {planEx?.sets}x{planEx?.reps} RIR {planEx?.rir}
                    </span>
                  </div>
                  {exLog.wasSwapped && originalEx && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <ArrowLeftRight size={10} className="text-[#00796B]" />
                      <span className="text-[10px] text-[#00796B] font-medium">
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
                      <div key={s.setNumber} className={`flex items-center px-4 py-2 text-xs border-t border-neutral-50 first:border-t-0 ${
                        isUnder ? 'bg-[#C81D6B]/[0.03]' : isOver ? 'bg-[#00796B]/[0.03]' : ''
                      }`}>
                        <span className="w-8 text-neutral-300 font-bold">{s.setNumber}</span>
                        <span className="text-neutral-400 flex-1">{planEx?.reps} reps</span>
                        <span className="font-semibold text-[#121212] mr-1">{s.actualWeight}kg</span>
                        <span className="text-neutral-300 mr-1">&times;</span>
                        <span className={`font-bold ${
                          isUnder ? 'text-[#C81D6B]' : isOver ? 'text-[#00796B]' : 'text-[#121212]'
                        }`}>
                          {s.actualReps}
                        </span>
                        {repsDiff !== null && repsDiff !== 0 && (
                          <span className={`ml-2 text-[9px] font-bold rounded-full px-1.5 py-0.5 ${
                            isUnder ? 'bg-[#C81D6B]/10 text-[#C81D6B]' : 'bg-[#00796B]/10 text-[#00796B]'
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
      <div className="px-4 pb-10">
        <button
          onClick={() => navigate('/portal/plan')}
          className="w-full py-3.5 bg-[#121212] text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2"
        >
          Back to Plan
          <ArrowRight size={16} />
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
        <div className="bg-[#C81D6B]/5 px-6 pt-6 pb-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-[#C81D6B]/10 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-[#C81D6B]" />
          </div>
          <AlertDialogHeader className="p-0 space-y-1">
            <AlertDialogTitle className="text-[#121212] text-base">
              {missingSets} unlogged {missingSets === 1 ? 'set' : 'sets'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-neutral-500">
              You've completed {completedSets} of {totalSets} sets ({completionPercent}%).
              Finish now or go back to log the rest.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Partial stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <Dumbbell size={16} className="text-[#C81D6B] mx-auto mb-1" />
              <p className="text-base font-serif font-bold text-[#121212]">{partialVolume.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">kg logged</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <Flame size={16} className="text-[#00796B] mx-auto mb-1" />
              <p className="text-base font-serif font-bold text-[#121212]">{sortedMuscles.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">muscle groups</p>
            </div>
          </div>

          {/* Muscle pills */}
          {sortedMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sortedMuscles.map(([muscle]) => (
                <span key={muscle} className="text-[10px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5 font-medium">{muscle}</span>
              ))}
            </div>
          )}

          {/* Missing exercises list */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Unlogged</p>
            <div className="space-y-1.5">
              {incomplete.map(({ name, missing, total }) => (
                <div key={name} className="flex items-center justify-between text-xs bg-[#C81D6B]/[0.03] rounded-lg px-3 py-2">
                  <span className="font-medium text-[#121212]">{name}</span>
                  <span className="text-[#C81D6B] font-semibold">{missing}/{total} sets</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-row gap-3 px-6 pb-6 pt-2">
          <AlertDialogCancel className="flex-1 rounded-xl border-neutral-200 text-[#121212] hover:bg-neutral-50 font-semibold">
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-[#C81D6B] text-white hover:bg-[#B0185E] font-semibold"
          >
            Finish Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

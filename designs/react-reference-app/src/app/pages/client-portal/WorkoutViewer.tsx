import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTraining } from '../../context/TrainingContext';
import type { Exercise } from '../../context/TrainingContext';
import {
  ArrowLeft,
  ArrowLeftRight,
  Activity,
  Trophy,
  Dumbbell,
  Clock,
  Flame,
  ArrowRight,
  AlertTriangle,
  MoreVertical,
  Flag,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ActiveExerciseCard } from '../../components/workout/ActiveExerciseCard';
import { ActiveSupersetGroup } from '../../components/workout/ActiveSupersetGroup';
import { RestTimer } from '../../components/workout/RestTimer';
import { VideoSheet } from '../../components/workout/VideoSheet';
import { SwapSheet } from '../../components/workout/SwapSheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../components/ui/alert-dialog';
import { BottomSheet } from '../../components/ui/bottom-sheet';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { RirBadge } from '../../components/workout/RirBadge';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { displayWeightValue, weightUnitLabel } from '../../utils/units';
import { EmptyState } from '../../components/EmptyState';
import { MetricTile } from '../../components/MetricTile';
import { LABEL_CLASS, VALUE_LG_CLASS } from '../../components/typography';
import { cn } from '../../components/ui/utils';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function WorkoutViewer() {
  const { planId, weekIdx: weekIdxParam, dayIdx: dayIdxParam } = useParams();
  const navigate = useNavigate();
  const {
    planInstances,
    exercises,
    activeWorkout,
    startWorkout,
    logSet,
    addExtraSet,
    swapExercise,
    recordRestTime,
    completeWorkout,
  } = useTraining();

  const weekIdx = parseInt(weekIdxParam ?? '0', 10);
  const dayIdx = parseInt(dayIdxParam ?? '0', 10);

  const plan = planInstances.find((p) => p.id === planId);
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
    const groups: {
      isSuperset: boolean;
      id: string;
      items: typeof day.exercises;
    }[] = [];
    const processedIds = new Set<string>();
    day.exercises.forEach((pe) => {
      if (processedIds.has(pe.id)) return;
      if (pe.supersetId) {
        const ssItems = day.exercises.filter(
          (e) => e.supersetId === pe.supersetId,
        );
        groups.push({ isSuperset: true, id: pe.supersetId, items: ssItems });
        ssItems.forEach((i) => processedIds.add(i.id));
      } else {
        groups.push({ isSuperset: false, id: pe.id, items: [pe] });
        processedIds.add(pe.id);
      }
    });
    return groups;
  }, [day]);

  // Progress calculation
  const totalSets =
    activeWorkout?.exercises.reduce((t, e) => t + e.sets.length, 0) || 0;
  const completedSets =
    activeWorkout?.exercises.reduce(
      (t, e) => t + e.sets.filter((s) => s.completed).length,
      0,
    ) || 0;
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const allSetsComplete = completedSets === totalSets && totalSets > 0;
  const isCompleted = activeWorkout?.status === 'completed';

  // Handlers
  const handleSetComplete = useCallback(
    (exerciseLogIndex: number, setNumber: number) => {
      if (!activeWorkout || !day) return;
      const pe = day.exercises[exerciseLogIndex];
      const restSec = pe?.restSeconds || 90;
      setTimerSeconds(restSec);
      setTimerExerciseIdx(exerciseLogIndex);
      setTimerSetIdx(setNumber);
      setShowTimer(true);
    },
    [activeWorkout, day],
  );

  const handleTimerComplete = useCallback(
    (actualSeconds: number) => {
      recordRestTime(timerExerciseIdx, timerSetIdx, actualSeconds);
      setShowTimer(false);
    },
    [recordRestTime, timerExerciseIdx, timerSetIdx],
  );

  const handleTimerSkip = useCallback(
    (actualSeconds: number) => {
      recordRestTime(timerExerciseIdx, timerSetIdx, actualSeconds);
      setShowTimer(false);
    },
    [recordRestTime, timerExerciseIdx, timerSetIdx],
  );

  const handleVideoPress = useCallback((ex: Exercise) => {
    setVideoExercise(ex);
  }, []);

  const handleSwapPress = useCallback((exerciseLogIndex: number) => {
    setSwapExerciseIdx(exerciseLogIndex);
  }, []);

  const handleSwap = useCallback(
    (newExerciseId: string) => {
      if (swapExerciseIdx !== null) {
        swapExercise(swapExerciseIdx, newExerciseId);
      }
    },
    [swapExercise, swapExerciseIdx],
  );

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
      <div className="fixed inset-0 bg-surface-page flex flex-col items-center justify-center px-6">
        <EmptyState
          icon={Activity}
          title="Workout not found"
          description="We couldn't find this workout. It may have been removed or the link is incorrect."
          action={
            <Button
              onClick={() => navigate('/portal/plan')}
              variant="primary"
              size="md"
            >
              <ArrowLeft size={16} />
              Back to Plan
            </Button>
          }
        />
      </div>
    );
  }

  // ── Summary view ────────────────────────────────────────────
  if (isCompleted && activeWorkout) {
    return (
      <WorkoutSummary
        workout={activeWorkout}
        exercises={exercises}
        day={day}
        week={week}
        navigate={navigate}
      />
    );
  }

  // ── Active workout view ─────────────────────────────────────
  let exerciseCounter = 0;

  return (
    <div className="fixed inset-0 bg-surface-page flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 h-14 lg:h-16 bg-card border-b border-border rounded-field flex items-center justify-between gap-2 px-4">
        <Button
          type="button"
          onClick={() => navigate('/portal/plan')}
          aria-label="Back to plan"
          variant="ghost"
          size="icon-sm"
          className="lg:size-11"
        >
          <ArrowLeft size={20} className="text-text-primary lg:size-6" />
        </Button>
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 text-center">
          <span className="text-sm lg:text-base font-semibold text-text-primary truncate">
            {DAY_NAMES[day.dayOfWeek]} &mdash; {day.type}
          </span>
          <Badge className="border-transparent bg-primary-soft text-primary shrink-0">
            W{week.order}
          </Badge>
        </div>
        <Button
          type="button"
          onClick={() => setOptionsOpen(true)}
          aria-label="Workout options"
          aria-haspopup="dialog"
          aria-expanded={optionsOpen}
          variant="ghost"
          size="icon-sm"
          className="lg:size-11"
        >
          <MoreVertical size={22} className="text-text-primary lg:size-6" />
        </Button>
      </div>

      <BottomSheet
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        title="Workout options"
      >
        <div className="px-3 pb-2 pt-2">
          <Button
            type="button"
            onClick={() => {
              setOptionsOpen(false);
              handleCompletePress();
            }}
            variant="ghost"
            size="md"
            className="w-full h-14 justify-start gap-4 px-4 rounded-card text-left text-base font-medium"
          >
            <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-primary-soft">
              <Flag size={20} className="text-primary" />
            </span>
            <span className="flex-1">End workout</span>
          </Button>
        </div>
        <div className="px-4 pt-2 pb-4 border-t border-border-subtle mt-1">
          <Button
            type="button"
            onClick={() => setOptionsOpen(false)}
            variant="ghost"
            size="sm"
            className="w-full h-12 rounded-control text-sm font-semibold"
          >
            Cancel
          </Button>
        </div>
      </BottomSheet>

      {/* Progress */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3">
        <span className="text-xs lg:text-sm font-medium text-text-secondary">
          {completedSets}/{totalSets} sets
        </span>
        <div className="flex-1 h-1.5 lg:h-2 bg-surface-quiet rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs lg:text-sm font-medium text-primary">
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Scrollable exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {groupedExercises.map((group, gIdx) => {
          if (group.isSuperset && activeWorkout) {
            const ssExercises = group.items
              .map((pe) => {
                exerciseCounter++;
                const logIdx = day.exercises.findIndex((e) => e.id === pe.id);
                const exLog = activeWorkout.exercises[logIdx];
                const ex = exercises.find(
                  (e) => e.id === (exLog?.exerciseId || pe.exerciseId),
                );
                return {
                  exercise: ex!,
                  planExercise: pe,
                  exerciseLog: exLog,
                  exerciseLogIndex: logIdx,
                  number: exerciseCounter,
                };
              })
              .filter((e) => e.exercise && e.exerciseLog);

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
          const logIdx = day.exercises.findIndex((e) => e.id === pe.id);
          const exLog = activeWorkout?.exercises[logIdx];
          const ex = exercises.find(
            (e) => e.id === (exLog?.exerciseId || pe.exerciseId),
          );
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
            <Button
              type="button"
              onClick={handleCompletePress}
              variant="primary"
              size="md"
              className="w-full lg:text-lg"
            >
              <Trophy size={20} className="lg:size-6" aria-hidden="true" />
              Complete Workout
            </Button>
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
      {swapExerciseIdx !== null &&
        activeWorkout &&
        day &&
        (() => {
          const pe = day.exercises[swapExerciseIdx];
          const exLog = activeWorkout.exercises[swapExerciseIdx];
          if (!pe?.swapVariants?.length || !exLog) return null;
          const originalEx = exercises.find(
            (e) => e.id === exLog.originalExerciseId,
          );
          const variantExercises = pe.swapVariants
            .map((id) => exercises.find((e) => e.id === id))
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

function WorkoutSummary({
  workout,
  exercises: allExercises,
  day,
  week,
  navigate,
}: {
  workout: NonNullable<ReturnType<typeof useTraining>['activeWorkout']>;
  exercises: Exercise[];
  day: {
    dayOfWeek: number;
    type: string;
    exercises: {
      id: string;
      exerciseId: string;
      sets: number;
      reps: string;
      rir: number;
    }[];
  };
  week: { order: number };
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { weightUnit } = useUnitPreferences();
  if (!workout) return null;

  const durationMin = workout.duration ? Math.round(workout.duration / 60) : 0;
  const totalVolume = workout.totalVolume || 0;

  // Collect muscle groups
  const muscleGroups: Record<string, number> = {};
  workout.exercises.forEach((exLog) => {
    const ex = allExercises.find((e) => e.id === exLog.exerciseId);
    if (ex) {
      ex.primaryMuscles.forEach((m) => {
        muscleGroups[m] = (muscleGroups[m] || 0) + 1;
      });
    }
  });

  const sortedMuscles = Object.entries(muscleGroups).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="fixed inset-0 bg-surface-page flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 pt-12 pb-6 px-6 text-center bg-gradient-to-b from-primary-soft to-transparent">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 lg:w-20 lg:h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Trophy size={28} className="text-primary-foreground lg:size-9" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl lg:text-3xl font-serif text-text-primary mb-1"
        >
          Great work!
        </motion.h1>
        <p className="text-sm lg:text-base text-text-secondary">
          {DAY_NAMES[day.dayOfWeek]} &mdash; {day.type} &middot; Week{' '}
          {week.order}
        </p>
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-4 w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-card rounded-control p-4 lg:p-5 text-center border border-border">
            <Clock
              size={18}
              className="text-text-secondary mx-auto mb-1.5 lg:size-6"
            />
            <p className={cn(VALUE_LG_CLASS, 'tabular-nums')}>{durationMin}</p>
            <p className={LABEL_CLASS}>min</p>
          </div>
          <div className="bg-card rounded-control p-4 lg:p-5 text-center border border-border">
            <Dumbbell
              size={18}
              className="text-primary mx-auto mb-1.5 lg:size-6"
            />
            <p className={cn(VALUE_LG_CLASS, 'tabular-nums')}>
              {displayWeightValue(totalVolume, weightUnit, 0).toLocaleString()}
            </p>
            <p className={LABEL_CLASS}>{weightUnitLabel(weightUnit)} vol</p>
          </div>
          <div className="bg-card rounded-control p-4 lg:p-5 text-center border border-border">
            <Flame
              size={18}
              className="text-brand-secondary mx-auto mb-1.5 lg:size-6"
            />
            <p className={cn(VALUE_LG_CLASS, 'tabular-nums')}>
              {workout.exercises.length}
            </p>
            <p className={LABEL_CLASS}>exercises</p>
          </div>
        </div>
      </div>

      {/* Muscle groups */}
      <div className="px-4 pb-4 w-full max-w-2xl mx-auto">
        <h3 className={cn(LABEL_CLASS, 'mb-3')}>Muscles Worked</h3>
        <div className="flex flex-wrap gap-2">
          {sortedMuscles.map(([muscle, count]) => (
            <Badge key={muscle} tone="brand-secondary">
              {muscle} ({count})
            </Badge>
          ))}
        </div>
      </div>

      {/* Exercise breakdown */}
      <div className="px-4 pb-8 w-full max-w-2xl mx-auto">
        <h3 className={cn(LABEL_CLASS, 'mb-3')}>Exercise Breakdown</h3>
        <div className="space-y-3">
          {workout.exercises.map((exLog, i) => {
            const ex = allExercises.find((e) => e.id === exLog.exerciseId);
            const originalEx = exLog.wasSwapped
              ? allExercises.find((e) => e.id === exLog.originalExerciseId)
              : null;
            const planEx = day.exercises[i];
            if (!ex) return null;
            return (
              <div
                key={exLog.planExerciseId}
                className="bg-card rounded-control border border-border overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm lg:text-base text-text-primary">
                      {ex.name}
                    </span>
                    <span className="text-xs text-text-secondary inline-flex items-center gap-1.5">
                      {planEx?.sets}x{planEx?.reps}
                      {planEx?.rir != null && <RirBadge value={planEx.rir} />}
                    </span>
                  </div>
                  {exLog.wasSwapped && originalEx && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <ArrowLeftRight
                        size={10}
                        className="text-brand-secondary lg:size-3"
                      />
                      <span className="text-xs text-brand-secondary font-medium">
                        Swapped from {originalEx.name}
                      </span>
                    </div>
                  )}
                </div>
                {/* Sets */}
                <div className="border-t border-border-subtle">
                  {exLog.sets
                    .filter((s) => s.completed)
                    .map((s) => {
                      const prescribedNum = parseInt(planEx?.reps || '0');
                      const repsDiff =
                        s.actualReps != null && !isNaN(prescribedNum)
                          ? s.actualReps - prescribedNum
                          : null;
                      const isUnder = repsDiff !== null && repsDiff < 0;
                      const isOver = repsDiff !== null && repsDiff > 0;
                      return (
                        <div
                          key={s.setNumber}
                          className={`flex items-center px-4 py-2 lg:py-2.5 text-xs lg:text-sm border-t border-border-subtle first:border-t-0 ${
                            isUnder
                              ? 'bg-primary-soft'
                              : isOver
                                ? 'bg-brand-secondary-soft'
                                : ''
                          }`}
                        >
                          <span className="w-8 font-medium text-text-secondary">
                            {s.setNumber}
                          </span>
                          <span className="text-text-secondary flex-1">
                            {planEx?.reps} reps
                          </span>
                          <span className="font-medium text-text-primary mr-1">
                            {s.actualWeight != null
                              ? displayWeightValue(s.actualWeight, weightUnit)
                              : 0}
                            {weightUnitLabel(weightUnit)}
                          </span>
                          <span className="text-text-secondary mr-1">
                            &times;
                          </span>
                          <span
                            className={`font-medium ${
                              isUnder
                                ? 'text-primary'
                                : isOver
                                  ? 'text-brand-secondary'
                                  : 'text-text-primary'
                            }`}
                          >
                            {s.actualReps}
                          </span>
                          {repsDiff !== null && repsDiff !== 0 && (
                            <Badge
                              className={cn(
                                'ml-2 border-transparent',
                                isUnder
                                  ? 'bg-primary-soft text-primary'
                                  : 'bg-brand-secondary-soft text-brand-secondary',
                              )}
                            >
                              {repsDiff > 0 ? `+${repsDiff}` : repsDiff}
                            </Badge>
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
        <Button
          onClick={() => navigate('/portal/plan')}
          variant="primary"
          size="md"
          className="w-full lg:text-base"
        >
          Back to Plan
          <ArrowRight size={16} className="lg:size-5" />
        </Button>
      </div>
    </div>
  );
}

// ── Incomplete Workout Dialog ──────────────────────────────────

function IncompleteWorkoutDialog({
  open,
  onOpenChange,
  onConfirm,
  completedSets,
  totalSets,
  activeWorkout,
  exercises: allExercises,
}: {
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
  const completionPercent =
    totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  // Compute partial stats
  const partialVolume = activeWorkout.exercises.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce(
        (exTotal, s) =>
          exTotal +
          (s.completed && s.actualWeight && s.actualReps
            ? s.actualWeight * s.actualReps
            : 0),
        0,
      ),
    0,
  );

  // Muscle groups from completed exercises (at least 1 set done)
  const muscleGroups: Record<string, number> = {};
  activeWorkout.exercises.forEach((exLog) => {
    const hasCompletedSet = exLog.sets.some((s) => s.completed);
    if (hasCompletedSet) {
      const ex = allExercises.find((e) => e.id === exLog.exerciseId);
      ex?.primaryMuscles.forEach((m) => {
        muscleGroups[m] = (muscleGroups[m] || 0) + 1;
      });
    }
  });
  const sortedMuscles = Object.entries(muscleGroups).sort(
    (a, b) => b[1] - a[1],
  );

  // Exercises with missing sets
  const incomplete = activeWorkout.exercises
    .map((exLog) => {
      const missing = exLog.sets.filter((s) => !s.completed).length;
      if (missing === 0) return null;
      const ex = allExercises.find((e) => e.id === exLog.exerciseId);
      return { name: ex?.name || 'Unknown', missing, total: exLog.sets.length };
    })
    .filter(Boolean) as { name: string; missing: number; total: number }[];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md rounded-card p-0 overflow-hidden">
        {/* Warning header */}
        <div className="bg-primary-soft px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-primary" />
          </div>
          <AlertDialogHeader className="p-0 space-y-1 text-left sm:text-left">
            <AlertDialogTitle className="text-text-primary text-base">
              {missingSets} unlogged {missingSets === 1 ? 'set' : 'sets'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-text-secondary">
              You've completed {completedSets} of {totalSets} sets (
              {completionPercent}%). Finish now or go back to log the rest.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Partial stats */}
          <div className="grid grid-cols-2 gap-3">
            <MetricTile
              tone="primary"
              icon={<Dumbbell size={16} />}
              label={`${weightUnitLabel(weightUnit)} logged`}
              value={displayWeightValue(
                partialVolume,
                weightUnit,
                0,
              ).toLocaleString()}
            />
            <MetricTile
              tone="brand-secondary"
              icon={<Flame size={16} />}
              label="Muscle groups"
              value={sortedMuscles.length}
            />
          </div>

          {/* Muscle pills */}
          {sortedMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sortedMuscles.map(([muscle]) => (
                <Badge key={muscle} tone="brand-secondary">
                  {muscle}
                </Badge>
              ))}
            </div>
          )}

          {/* Missing exercises list */}
          <div>
            <p className={cn(LABEL_CLASS, 'mb-2')}>Unlogged</p>
            <div className="space-y-1.5">
              {incomplete.map(({ name, missing, total }) => (
                <div
                  key={name}
                  className="flex items-center justify-between text-xs bg-primary-soft rounded-compact px-3 py-2"
                >
                  <span className="font-medium text-text-primary">{name}</span>
                  <span className="text-primary font-medium">
                    {missing}/{total} sets
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-row gap-3 px-6 pb-6 pt-2">
          <AlertDialogCancel className="flex-1 rounded-control border-border text-text-primary hover:bg-surface-quiet font-semibold">
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 rounded-control bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
          >
            Finish Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

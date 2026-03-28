import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTraining } from '../../context/TrainingContext';
import { ArrowLeft, PlayCircle, Activity } from 'lucide-react';
import { motion } from 'motion/react';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WorkoutViewer() {
  const { planId, weekIdx: weekIdxParam, dayIdx: dayIdxParam } = useParams();
  const navigate = useNavigate();
  const { planInstances, exercises } = useTraining();

  const weekIdx = parseInt(weekIdxParam ?? '0', 10);
  const dayIdx = parseInt(dayIdxParam ?? '0', 10);

  const plan = planInstances.find(p => p.id === planId);
  const week = plan?.weeks[weekIdx];
  const day = week?.days[dayIdx];

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

  const totalExercises = day ? day.exercises.length : 0;

  // ── Error state ────────────────────────────────────────────────
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

  // ── Running exercise index (for numbering) ─────────────────────
  let exerciseCounter = 0;

  return (
    <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col">
      {/* ── Top bar ────────────────────────────────────────────────── */}
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

      {/* ── Progress indicator ─────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3">
        <span className="text-xs font-medium text-neutral-400">
          {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
        </span>
        <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C81D6B] rounded-full"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* ── Scrollable exercise list ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {groupedExercises.map((group, gIdx) => {
          if (group.isSuperset) {
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gIdx * 0.07, duration: 0.35 }}
                className="border-2 border-[#00796B]/20 bg-[#00796B]/5 p-4 rounded-2xl space-y-3"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-[#00796B] flex items-center gap-2">
                  <Activity size={14} /> Superset
                </div>

                {group.items.map(pe => {
                  exerciseCounter++;
                  const ex = exercises.find(e => e.id === pe.exerciseId);
                  if (!ex) return null;
                  return (
                    <ExerciseCard
                      key={pe.id}
                      number={exerciseCounter}
                      exercise={ex}
                      planExercise={pe}
                    />
                  );
                })}
              </motion.div>
            );
          }

          const pe = group.items[0];
          exerciseCounter++;
          const ex = exercises.find(e => e.id === pe.exerciseId);
          if (!ex) return null;

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gIdx * 0.07, duration: 0.35 }}
            >
              <ExerciseCard
                number={exerciseCounter}
                exercise={ex}
                planExercise={pe}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Exercise card sub-component ──────────────────────────────────

interface ExerciseCardProps {
  number: number;
  exercise: {
    name: string;
    equipment: string[];
    primaryMuscles: string[];
    videoUrl?: string;
  };
  planExercise: {
    sets: number;
    reps: string;
    rir: number;
    notes?: string;
  };
}

function ExerciseCard({ number, exercise, planExercise }: ExerciseCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
      {/* Header row: number + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-[#121212] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[#121212] leading-tight">{exercise.name}</h3>

          {/* Equipment pills */}
          {exercise.equipment.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {exercise.equipment.map(eq => (
                <span
                  key={eq}
                  className="text-[11px] bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5"
                >
                  {eq}
                </span>
              ))}
            </div>
          )}

          {/* Primary muscle pills */}
          {exercise.primaryMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {exercise.primaryMuscles.map(m => (
                <span
                  key={m}
                  className="text-[11px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sets / Reps / RIR row */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Sets</p>
          <p className="text-2xl font-serif font-bold text-[#121212]">{planExercise.sets}</p>
        </div>
        <div className="w-px h-10 bg-neutral-100" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Reps</p>
          <p className="text-2xl font-serif font-bold text-[#121212]">{planExercise.reps}</p>
        </div>
        <div className="w-px h-10 bg-neutral-100" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[#C81D6B] font-bold mb-1">RIR</p>
          <p className="text-2xl font-serif font-bold text-[#C81D6B]">{planExercise.rir}</p>
        </div>
      </div>

      {/* Coach notes */}
      {planExercise.notes && (
        <div className="mt-4 bg-[#00796B]/5 border-l-2 border-[#00796B] p-3 rounded-r-lg">
          <p className="text-sm italic text-neutral-700">{planExercise.notes}</p>
        </div>
      )}

      {/* Video placeholder */}
      {exercise.videoUrl && (
        <div className="mt-4 aspect-video bg-neutral-900 rounded-xl flex items-center justify-center">
          <PlayCircle size={48} className="text-white/80" />
        </div>
      )}
    </div>
  );
}

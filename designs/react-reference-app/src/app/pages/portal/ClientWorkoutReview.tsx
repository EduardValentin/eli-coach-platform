import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ArrowLeftRight, ArrowRight, Clock, Dumbbell, Timer, TrendingUp, Zap } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import type { Exercise, ExerciseLog } from '../../context/TrainingContext';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PIE_COLORS = ['#C81D6B', '#00796B', '#121212', '#717182', '#cbced4'];

function estimateRM(weight: number, reps: number, targetReps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === targetReps) return weight;
  const oneRM = weight * (1 + reps / 30);
  if (targetReps === 1) return Math.round(oneRM * 10) / 10;
  return Math.round((oneRM / (1 + targetReps / 30)) * 10) / 10;
}

function getBestSet(exLog: ExerciseLog): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number; estimated1RM: number } | null = null;
  for (const s of exLog.sets) {
    if (s.completed && s.actualWeight && s.actualReps) {
      const est = estimateRM(s.actualWeight, s.actualReps, 1);
      if (!best || est > best.estimated1RM) {
        best = { weight: s.actualWeight, reps: s.actualReps, estimated1RM: est };
      }
    }
  }
  return best ? { weight: best.weight, reps: best.reps } : null;
}

function getFatigueIndex(exLog: ExerciseLog): number | null {
  const completedSets = exLog.sets.filter(s => s.completed && s.actualReps != null);
  if (completedSets.length < 2) return null;
  const firstReps = completedSets[0].actualReps!;
  const lastReps = completedSets[completedSets.length - 1].actualReps!;
  if (firstReps === 0) return null;
  return Math.round(((firstReps - lastReps) / firstReps) * 100);
}

export function ClientWorkoutReview() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const { workoutLogs, exercises, planInstances } = useTraining();

  const workout = workoutLogs.find(w => w.id === logId);

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-serif font-bold text-[#121212] mb-2">Session Not Found</h2>
        <p className="text-neutral-500 text-sm mb-6">This workout session couldn't be found.</p>
        <button onClick={() => navigate('/portal/history')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121212] text-white text-sm font-semibold rounded-xl">
          <ArrowLeft size={16} /> Back to History
        </button>
      </div>
    );
  }

  const plan = planInstances.find(p => p.id === workout.planInstanceId);
  const week = plan?.weeks[workout.weekIndex];
  const day = week?.days[workout.dayIndex];
  const durationMin = workout.duration ? Math.round(workout.duration / 60) : 0;
  const totalSets = workout.exercises.reduce((t, e) => t + e.sets.length, 0);
  const completedSets = workout.exercises.reduce((t, e) => t + e.sets.filter(s => s.completed).length, 0);
  const adherence = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const density = durationMin > 0 ? Math.round((workout.totalVolume || 0) / durationMin) : 0;
  const workoutDate = new Date(workout.startedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const volumeChartData = useMemo(() =>
    workout.exercises.map(exLog => {
      const ex = exercises.find(e => e.id === exLog.exerciseId);
      const vol = exLog.sets.reduce((t, s) => t + (s.completed && s.actualWeight && s.actualReps ? s.actualWeight * s.actualReps : 0), 0);
      return { name: ex?.name?.split(' ').slice(0, 2).join(' ') || '?', volume: vol };
    }), [workout.exercises, exercises]);

  const muscleVolumeData = useMemo(() => {
    const muscleVol: Record<string, number> = {};
    workout.exercises.forEach(exLog => {
      const ex = exercises.find(e => e.id === exLog.exerciseId);
      const vol = exLog.sets.reduce((t, s) => t + (s.completed && s.actualWeight && s.actualReps ? s.actualWeight * s.actualReps : 0), 0);
      if (ex) ex.primaryMuscles.forEach(m => { muscleVol[m] = (muscleVol[m] || 0) + vol; });
    });
    return Object.entries(muscleVol).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [workout.exercises, exercises]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/portal/history')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors">
          <ArrowLeft size={20} className="text-[#121212]" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#121212]">Session Review</h1>
          <p className="text-sm text-neutral-500">{workoutDate}{day ? ` \u00B7 ${day.type}` : ''}{week ? ` \u00B7 Week ${week.order}` : ''}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-neutral-400" /><span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Duration</span></div>
          <p className="text-xl font-serif font-bold text-[#121212]">{durationMin} min</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2"><Dumbbell size={16} className="text-[#C81D6B]" /><span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Volume</span></div>
          <p className="text-xl font-serif font-bold text-[#121212]">{(workout.totalVolume || 0).toLocaleString()} kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-[#00796B]" /><span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Completed</span></div>
          <p className="text-xl font-serif font-bold text-[#121212]">{completedSets}/{totalSets}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2"><Zap size={16} className="text-[#C81D6B]" /><span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Density</span></div>
          <p className="text-xl font-serif font-bold text-[#121212]">{density}</p>
          <p className="text-[10px] text-neutral-400">kg/min</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2"><Timer size={16} className="text-neutral-400" /><span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Day</span></div>
          <p className="text-lg font-serif font-bold text-[#121212]">{day ? DAY_NAMES[day.dayOfWeek] : 'N/A'}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Volume per exercise */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Volume per Exercise</h3>
          <div className="space-y-3">
            {(() => {
              const maxVol = Math.max(...volumeChartData.map(d => d.volume), 1);
              return volumeChartData.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#121212] truncate mr-2">{d.name}</span>
                    <span className="text-xs text-neutral-400 shrink-0">{d.volume.toLocaleString()} kg</span>
                  </div>
                  <div className="h-5 bg-neutral-100 rounded-md overflow-hidden">
                    <div className="h-full bg-[#C81D6B] rounded-md transition-all" style={{ width: `${(d.volume / maxVol) * 100}%` }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Muscle group split */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Muscle Groups</h3>
          {(() => {
            const total = muscleVolumeData.reduce((t, d) => t + d.value, 0) || 1;
            return (
              <div className="space-y-3">
                <div className="h-6 rounded-full overflow-hidden flex">
                  {muscleVolumeData.map((d, i) => (
                    <div key={d.name} className="h-full" style={{ width: `${(d.value / total) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  ))}
                </div>
                <div className="space-y-2 mt-2">
                  {muscleVolumeData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-[#121212] font-medium">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">{d.value.toLocaleString()} kg</span>
                        <span className="text-[10px] text-neutral-300">{Math.round((d.value / total) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Estimated Rep Maxes */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Your Estimated Maxes</h3>
        <p className="text-[10px] text-neutral-400 mb-4">Based on your heaviest set this session (Epley formula)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold border-b border-neutral-100">
                <th className="pb-3 pr-4 font-bold">Exercise</th>
                <th className="pb-3 pr-3 font-bold text-center">Best Set</th>
                <th className="pb-3 pr-3 font-bold text-center">Est. 1RM</th>
                <th className="pb-3 pr-3 font-bold text-center">Est. 3RM</th>
                <th className="pb-3 font-bold text-center">Fatigue</th>
              </tr>
            </thead>
            <tbody>
              {workout.exercises.map(exLog => {
                const ex = exercises.find(e => e.id === exLog.exerciseId);
                if (!ex) return null;
                const best = getBestSet(exLog);
                const fatigue = getFatigueIndex(exLog);
                if (!best) return null;
                const e1RM = estimateRM(best.weight, best.reps, 1);
                const e3RM = estimateRM(best.weight, best.reps, 3);
                return (
                  <tr key={exLog.planExerciseId} className="border-b border-neutral-50 last:border-0">
                    <td className="py-3 pr-4"><span className="text-sm font-medium text-[#121212]">{ex.name}</span></td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-semibold text-[#121212]">{best.weight}kg</span>
                      <span className="text-[10px] text-neutral-400 ml-1">x{best.reps}</span>
                    </td>
                    <td className="py-3 pr-3 text-center"><span className="text-sm font-bold text-[#C81D6B]">{e1RM} kg</span></td>
                    <td className="py-3 pr-3 text-center"><span className="text-sm font-semibold text-[#121212]">{e3RM} kg</span></td>
                    <td className="py-3 text-center">
                      {fatigue !== null ? (
                        <span className={`text-sm font-bold ${fatigue > 25 ? 'text-[#C81D6B]' : fatigue > 10 ? 'text-neutral-500' : 'text-[#00796B]'}`}>
                          {fatigue > 0 ? `-${fatigue}%` : `${fatigue}%`}
                        </span>
                      ) : <span className="text-xs text-neutral-300">--</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exercise breakdown */}
      <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4">Your Sets</h2>
      <div className="space-y-4">
        {workout.exercises.map((exLog, i) => {
          const ex = exercises.find(e => e.id === exLog.exerciseId);
          const planEx = day?.exercises[i];
          if (!ex) return null;
          return (
            <div key={exLog.planExerciseId} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="p-5 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#121212]">{ex.name}</h3>
                  {exLog.wasSwapped && (
                    <span className="inline-flex items-center gap-1 text-[9px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5 font-bold"><ArrowLeftRight size={9} /> Swapped</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ex.primaryMuscles.map(m => (
                    <span key={m} className="text-[10px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5">{m}</span>
                  ))}
                </div>
              </div>
              <div className="border-t border-neutral-100">
                {exLog.sets.filter(s => s.completed).map(s => {
                  const prescribedNum = parseInt(planEx?.reps || '0');
                  const repsDiff = s.actualReps != null && !isNaN(prescribedNum) ? s.actualReps - prescribedNum : null;
                  const isUnder = repsDiff !== null && repsDiff < 0;
                  const isOver = repsDiff !== null && repsDiff > 0;
                  return (
                    <div key={s.setNumber} className={`flex items-center px-5 py-2.5 text-sm border-t border-neutral-50 first:border-t-0 ${isUnder ? 'bg-[#C81D6B]/[0.03]' : isOver ? 'bg-[#00796B]/[0.03]' : ''}`}>
                      <span className="w-8 text-xs text-neutral-300 font-bold">{s.setNumber}</span>
                      <span className="font-semibold text-[#121212]">{s.actualWeight}kg</span>
                      <span className="text-neutral-300 mx-1.5">&times;</span>
                      <span className={`font-bold ${isUnder ? 'text-[#C81D6B]' : isOver ? 'text-[#00796B]' : 'text-[#121212]'}`}>{s.actualReps}</span>
                      {repsDiff !== null && repsDiff !== 0 && (
                        <span className={`ml-2 text-[9px] font-bold rounded-full px-1.5 py-0.5 ${isUnder ? 'bg-[#C81D6B]/10 text-[#C81D6B]' : 'bg-[#00796B]/10 text-[#00796B]'}`}>
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

      {/* Back */}
      <div className="mt-8">
        <button onClick={() => navigate('/portal/history')} className="w-full py-3.5 bg-[#121212] text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2">
          Back to History <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

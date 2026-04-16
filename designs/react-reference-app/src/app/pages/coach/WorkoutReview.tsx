import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ArrowLeftRight, ArrowRight, Clock, Dumbbell, Timer, TrendingUp, Zap } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import type { Exercise, ExerciseLog } from '../../context/TrainingContext';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe', 'c1': 'Jane Doe', 'c2': 'Jessica Alba', 'c3': 'Emma Stone', 'c4': 'Sarah Jenkins', 'c5': 'Mia Thermopolis'
};

const PIE_COLORS = ['#C81D6B', '#00796B', '#121212', '#717182', '#cbced4'];

// ── Epley formula for estimated rep maxes ──────────────────────
function estimateRM(weight: number, reps: number, targetReps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === targetReps) return weight;
  const oneRM = weight * (1 + reps / 30);
  if (targetReps === 1) return Math.round(oneRM * 10) / 10;
  // Reverse Epley: weight = 1RM / (1 + targetReps/30)
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

export function WorkoutReview() {
  const { id: clientId, logId } = useParams();
  const navigate = useNavigate();
  const { workoutLogs, exercises, planInstances } = useTraining();

  const workout = workoutLogs.find(w => w.id === logId);
  const clientName = MOCK_CLIENTS[clientId || ''] || 'Unknown Client';

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-serif font-bold text-[#121212] mb-2">Workout Not Found</h2>
        <p className="text-neutral-500 text-sm mb-6">This workout log doesn't exist.</p>
        <button
          onClick={() => navigate(`/coach/clients/${clientId}`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121212] text-white text-sm font-semibold rounded-xl"
        >
          <ArrowLeft size={16} /> Back to Client
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
  const workoutDate = new Date(workout.startedAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
  });

  // ── Chart data ───────────────────────────────────────────────
  const volumeChartData = useMemo(() =>
    workout.exercises.map(exLog => {
      const ex = exercises.find(e => e.id === exLog.exerciseId);
      const vol = exLog.sets.reduce((t, s) =>
        t + (s.completed && s.actualWeight && s.actualReps ? s.actualWeight * s.actualReps : 0), 0);
      return {
        name: ex?.name?.split(' ').slice(0, 2).join(' ') || '?',
        volume: vol,
      };
    }), [workout.exercises, exercises]);

  const muscleVolumeData = useMemo(() => {
    const muscleVol: Record<string, number> = {};
    workout.exercises.forEach(exLog => {
      const ex = exercises.find(e => e.id === exLog.exerciseId);
      const vol = exLog.sets.reduce((t, s) =>
        t + (s.completed && s.actualWeight && s.actualReps ? s.actualWeight * s.actualReps : 0), 0);
      if (ex) {
        ex.primaryMuscles.forEach(m => {
          muscleVol[m] = (muscleVol[m] || 0) + vol;
        });
      }
    });
    return Object.entries(muscleVol)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [workout.exercises, exercises]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/coach/clients/${clientId}`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-[#121212]" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#121212]">Workout Review</h1>
          <p className="text-sm text-neutral-500">{clientName} &middot; {workoutDate}</p>
        </div>
      </div>

      {/* Summary stats — 5 cards now */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-neutral-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Duration</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{durationMin} min</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-[#C81D6B]" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Volume</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{(workout.totalVolume || 0).toLocaleString()} kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[#00796B]" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Adherence</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{adherence}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-[#C81D6B]" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Density</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{density}</p>
          <p className="text-[10px] text-neutral-400">kg/min</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Timer size={16} className="text-neutral-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Day</span>
          </div>
          <p className="text-lg font-serif font-bold text-[#121212]">
            {day ? `${DAY_NAMES[day.dayOfWeek]}` : 'N/A'}
          </p>
          <p className="text-[10px] text-neutral-400">{day?.type} &middot; W{week?.order}</p>
        </div>
      </div>

      {/* ── Analytics Section ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Volume per exercise — horizontal bar chart */}
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
                    <div
                      className="h-full bg-[#C81D6B] rounded-md transition-all"
                      style={{ width: `${(d.volume / maxVol) * 100}%` }}
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Muscle group volume split — legend-only (no pie dependency) */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Muscle Group Volume</h3>
          {(() => {
            const totalMuscleVol = muscleVolumeData.reduce((t, d) => t + d.value, 0) || 1;
            return (
              <div className="space-y-3">
                {/* Stacked bar */}
                <div className="h-6 rounded-full overflow-hidden flex">
                  {muscleVolumeData.map((d, i) => (
                    <div
                      key={d.name}
                      className="h-full transition-all"
                      style={{
                        width: `${(d.value / totalMuscleVol) * 100}%`,
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-2 mt-2">
                  {muscleVolumeData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-[#121212] font-medium">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">{d.value.toLocaleString()} kg</span>
                        <span className="text-[10px] text-neutral-300">{Math.round((d.value / totalMuscleVol) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Estimated Rep Maxes & Fatigue ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Estimated Rep Maxes & Fatigue</h3>
        <p className="text-[10px] text-neutral-400 mb-4">Estimated from the heaviest set using the Epley formula</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold border-b border-neutral-100">
                <th className="pb-3 pr-4 font-bold">Exercise</th>
                <th className="pb-3 pr-3 font-bold text-center">Best Set</th>
                <th className="pb-3 pr-3 font-bold text-center">Est. 1RM</th>
                <th className="pb-3 pr-3 font-bold text-center">Est. 2RM</th>
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
                const e2RM = estimateRM(best.weight, best.reps, 2);
                const e3RM = estimateRM(best.weight, best.reps, 3);

                return (
                  <tr key={exLog.planExerciseId} className="border-b border-neutral-50 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-[#121212]">{ex.name}</span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-semibold text-[#121212]">{best.weight}kg</span>
                      <span className="text-[10px] text-neutral-400 ml-1">x{best.reps}</span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-bold text-[#C81D6B]">{e1RM} kg</span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-semibold text-[#121212]">{e2RM} kg</span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-semibold text-[#121212]">{e3RM} kg</span>
                    </td>
                    <td className="py-3 text-center">
                      {fatigue !== null ? (
                        <span className={`text-sm font-bold ${
                          fatigue > 25 ? 'text-[#C81D6B]' : fatigue > 10 ? 'text-neutral-500' : 'text-[#00796B]'
                        }`}>
                          {fatigue > 0 ? `-${fatigue}%` : `${fatigue}%`}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-300">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-neutral-300 mt-3">
          Fatigue = % rep drop from first to last set. Under 10% = well managed. Over 25% = may need longer rest or lighter load.
        </p>
      </div>

      {/* ── Exercise detail cards (existing) ─────────────────────── */}
      <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4">Set-by-Set Breakdown</h2>
      <div className="space-y-5">
        {workout.exercises.map((exLog, i) => {
          const ex = exercises.find(e => e.id === exLog.exerciseId);
          const originalEx = exLog.wasSwapped ? exercises.find(e => e.id === exLog.originalExerciseId) : null;
          const planEx = day?.exercises[i];
          const avgRest = exLog.restTimeTaken.length > 0
            ? Math.round(exLog.restTimeTaken.reduce((a, b) => a + b, 0) / exLog.restTimeTaken.length)
            : null;
          const prescribedRest = planEx?.restSeconds;

          if (!ex) return null;

          return (
            <div key={exLog.planExerciseId} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              {/* Exercise header */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[#121212] text-base">{ex.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ex.equipment.map(eq => (
                        <span key={eq} className="text-[10px] bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5">{eq}</span>
                      ))}
                      {ex.primaryMuscles.map(m => (
                        <span key={m} className="text-[10px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Prescribed</span>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {planEx?.sets}x{planEx?.reps} &middot; RIR {planEx?.rir}
                    </p>
                    {prescribedRest && (
                      <p className="text-[10px] text-neutral-400">{prescribedRest}s rest</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Swap callout */}
              {exLog.wasSwapped && originalEx && (
                <SwapCallout original={originalEx} swappedTo={ex} />
              )}

              {/* Set-by-set comparison */}
              <div className="border-t border-neutral-100">
                <div className="grid grid-cols-[2.5rem_1fr_1fr_4rem] gap-2 px-5 py-2.5 bg-neutral-50/80 text-[9px] uppercase tracking-widest text-neutral-400 font-bold">
                  <span>Set</span>
                  <span>Prescribed</span>
                  <span>Logged</span>
                  <span className="text-right">Rest</span>
                </div>

                {exLog.sets.map((s, si) => {
                  const prescribedRepsStr = planEx?.reps || '--';
                  const prescribedNum = parseInt(prescribedRepsStr);
                  const repsDiff = s.actualReps != null && !isNaN(prescribedNum) ? s.actualReps - prescribedNum : null;
                  const isRepsUnder = repsDiff !== null && repsDiff < 0;
                  const isRepsOver = repsDiff !== null && repsDiff > 0;
                  const isRepsMatch = repsDiff !== null && repsDiff === 0;
                  const restTaken = exLog.restTimeTaken[si];
                  const isRestOver = restTaken != null && prescribedRest != null && restTaken > prescribedRest + 15;

                  return (
                    <div
                      key={s.setNumber}
                      className={`grid grid-cols-[2.5rem_1fr_1fr_4rem] gap-2 px-5 py-3 items-center border-t border-neutral-50 ${
                        isRepsUnder ? 'bg-[#C81D6B]/[0.03]' : isRepsOver ? 'bg-[#00796B]/[0.03]' : ''
                      }`}
                    >
                      <span className="text-xs font-bold text-neutral-300">{s.setNumber}</span>
                      <div>
                        <span className="text-sm text-neutral-500">{prescribedRepsStr} reps</span>
                        <span className="text-[10px] text-neutral-400 ml-1.5">RIR {planEx?.rir}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.completed ? (
                          <>
                            <span className="text-sm font-semibold text-[#121212]">{s.actualWeight}kg</span>
                            <span className="text-[10px] text-neutral-300">&times;</span>
                            <span className={`text-sm font-bold ${
                              isRepsUnder ? 'text-[#C81D6B]' : isRepsOver ? 'text-[#00796B]' : 'text-[#121212]'
                            }`}>
                              {s.actualReps}
                            </span>
                            {repsDiff !== null && !isRepsMatch && (
                              <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${
                                isRepsUnder ? 'bg-[#C81D6B]/10 text-[#C81D6B]' : 'bg-[#00796B]/10 text-[#00796B]'
                              }`}>
                                {repsDiff > 0 ? `+${repsDiff}` : repsDiff}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-neutral-300 italic">Skipped</span>
                        )}
                      </div>
                      <span className={`text-xs text-right ${isRestOver ? 'text-[#C81D6B] font-semibold' : 'text-neutral-400'}`}>
                        {restTaken != null ? `${restTaken}s` : '--'}
                      </span>
                    </div>
                  );
                })}

                {avgRest !== null && prescribedRest && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-neutral-100 bg-neutral-50/50">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Avg rest</span>
                    <span className={`text-xs font-semibold ${avgRest > prescribedRest + 15 ? 'text-[#C81D6B]' : 'text-[#121212]'}`}>
                      {avgRest}s
                      <span className="text-neutral-400 font-normal"> / {prescribedRest}s prescribed</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Swap callout component ─────────────────────────────────────

function SwapCallout({ original, swappedTo }: { original: Exercise; swappedTo: Exercise }) {
  return (
    <div className="mx-5 mb-4 rounded-xl border border-[#00796B]/20 bg-[#00796B]/[0.03] p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ArrowLeftRight size={13} className="text-[#00796B]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00796B]">Exercise Swapped</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1">Originally</p>
          <p className="text-sm font-medium text-neutral-500 line-through decoration-neutral-300">{original.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {original.primaryMuscles.map(m => (
              <span key={m} className="text-[9px] bg-neutral-100 text-neutral-400 rounded-full px-1.5 py-0.5">{m}</span>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <ArrowRight size={16} className="text-[#00796B]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#00796B] font-semibold uppercase tracking-wider mb-1">Performed</p>
          <p className="text-sm font-semibold text-[#121212]">{swappedTo.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {swappedTo.primaryMuscles.map(m => (
              <span key={m} className="text-[9px] bg-[#00796B]/10 text-[#00796B] rounded-full px-1.5 py-0.5">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

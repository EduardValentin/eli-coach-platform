import { useState, useMemo } from 'react';
import { useTraining } from '../../context/TrainingContext';
import { CalendarDays, PlayCircle, ChevronLeft, ChevronRight, Activity, Play, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';

export function ClientPlan() {
  const { clientActivePlan, exercises, goals } = useTraining();
  const navigate = useNavigate();

  // Default to current week on load
  const initialWeekIdx = clientActivePlan
    ? Math.max(0, (clientActivePlan.currentWeekNumber || 1) - 1)
    : 0;
  const [activeWeekIdx, setActiveWeekIdx] = useState(initialWeekIdx);

  const activeGoal = useMemo(() => {
    if (!clientActivePlan) return null;
    return goals.find(g => g.id === clientActivePlan.goalId) || null;
  }, [clientActivePlan, goals]);

  if (!clientActivePlan) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <CalendarDays size={32} className="text-neutral-400" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#121212] mb-2">No Active Plan</h2>
        <p className="text-neutral-500 max-w-md">You don't have an active training plan assigned right now. Your coach will assign one soon!</p>
      </div>
    );
  }

  const activeWeek = clientActivePlan.weeks[activeWeekIdx];
  if (!activeWeek) return null;

  const currentWeekIdx = (clientActivePlan.currentWeekNumber || 1) - 1;
  const totalWeeks = clientActivePlan.weeks.length;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Goal banner */}
      {activeGoal && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00796B]/10 text-[#00796B] rounded-full text-xs font-bold mb-4">
          <Target size={14} />
          {activeGoal.name} &mdash; {activeGoal.type}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C81D6B]/10 text-[#C81D6B] rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Activity size={14} /> Active Plan
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#121212]">{clientActivePlan.name}</h1>
          <p className="text-neutral-500 mt-2">{totalWeeks} Weeks &middot; Week {clientActivePlan.currentWeekNumber} of {totalWeeks}</p>
        </div>
      </div>

      {/* Horizontal week strip */}
      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setActiveWeekIdx(Math.max(0, activeWeekIdx - 1))}
            disabled={activeWeekIdx === 0}
            className="p-2 text-neutral-400 hover:text-[#121212] disabled:opacity-30 transition-colors shrink-0"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-2 overflow-x-auto">
            {clientActivePlan.weeks.map((week, idx) => {
              const isPast = idx < currentWeekIdx;
              const isCurrent = idx === currentWeekIdx;
              const isActive = idx === activeWeekIdx;

              return (
                <button
                  key={week.id}
                  onClick={() => setActiveWeekIdx(idx)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    isActive
                      ? 'bg-[#C81D6B] text-white border-[#C81D6B] shadow-md'
                      : isCurrent
                        ? 'bg-[#C81D6B]/10 text-[#C81D6B] border-[#C81D6B]/30'
                        : isPast
                          ? 'bg-neutral-50 text-neutral-400 border-neutral-100'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <span>W{week.order}</span>
                  {week.isDeload && <span className="ml-1 text-[10px] opacity-75">DL</span>}
                  {isCurrent && !isActive && <span className="ml-1 text-[10px]">●</span>}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveWeekIdx(Math.min(totalWeeks - 1, activeWeekIdx + 1))}
            disabled={activeWeekIdx === totalWeeks - 1}
            className="p-2 text-neutral-400 hover:text-[#121212] disabled:opacity-30 transition-colors shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week status label */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-[#121212]">Week {activeWeek.order}</span>
          {activeWeek.isDeload && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Deload</span>
          )}
          {activeWeekIdx < currentWeekIdx && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">Past</span>
          )}
          {activeWeekIdx === currentWeekIdx && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#C81D6B]/10 text-[#C81D6B] px-2 py-0.5 rounded-full">Current</span>
          )}
          {activeWeekIdx > currentWeekIdx && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">Upcoming</span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {activeWeek.days.map((day, dIdx) => {
          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const isRest = day.type === 'Rest';

          // Group supersets
          const groupedExercises: { isSuperset: boolean; id: string; items: typeof day.exercises }[] = [];
          const processedIds = new Set<string>();

          day.exercises.forEach(pe => {
            if (processedIds.has(pe.id)) return;
            if (pe.supersetId) {
              const ssItems = day.exercises.filter(e => e.supersetId === pe.supersetId);
              groupedExercises.push({ isSuperset: true, id: pe.supersetId, items: ssItems });
              ssItems.forEach(i => processedIds.add(i.id));
            } else {
              groupedExercises.push({ isSuperset: false, id: pe.id, items: [pe] });
              processedIds.add(pe.id);
            }
          });

          return (
            <motion.div 
              key={day.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dIdx * 0.05 }}
              className={`bg-white rounded-3xl border overflow-hidden ${
                isRest ? 'border-neutral-100 opacity-60' : 'border-neutral-200 shadow-sm'
              }`}
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                    isRest ? 'bg-neutral-100 text-neutral-400' : 'bg-[#121212] text-white shadow-md'
                  }`}>
                    {dIdx + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[#121212]">{dayNames[dIdx]}</h3>
                    <p className={`text-sm font-medium ${
                      isRest ? 'text-neutral-500' : 
                      day.type === 'Strength' ? 'text-[#C81D6B]' :
                      day.type === 'Hypertrophy' ? 'text-[#00796B]' : 'text-blue-600'
                    }`}>
                      {day.type} {isRest ? '' : 'Day'}
                    </p>
                  </div>
                </div>
                {!isRest && (
                  <button
                    onClick={() => navigate(`/portal/workout/${clientActivePlan.id}/${activeWeekIdx}/${dIdx}`)}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-[#121212] hover:bg-neutral-800 px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                  >
                    <Play size={14} fill="currentColor" />
                    Start
                  </button>
                )}
              </div>

              {!isRest && groupedExercises.length > 0 && (
                <div className="p-6 space-y-4">
                  {groupedExercises.map(group => (
                    <div key={group.id} className={`rounded-2xl ${group.isSuperset ? 'border-2 border-[#00796B]/20 bg-[#00796B]/5 p-4' : ''}`}>
                      {group.isSuperset && (
                        <div className="text-xs font-bold uppercase tracking-wider text-[#00796B] mb-3 flex items-center gap-2">
                          <Activity size={14} /> Superset
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {group.items.map(pe => {
                          const ex = exercises.find(e => e.id === pe.exerciseId);
                          if (!ex) return null;
                          return (
                            <div key={pe.id} className="bg-white border border-neutral-100 p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4 hover:border-[#C81D6B]/30 transition-colors group">
                              {ex.videoUrl ? (
                                <div className="w-full md:w-32 aspect-video bg-neutral-900 rounded-lg relative overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group-hover:opacity-90">
                                  <PlayCircle className="text-white drop-shadow-md z-10" size={24} />
                                  <div className="absolute inset-0 bg-black/40"></div>
                                </div>
                              ) : (
                                <div className="w-full md:w-32 aspect-video bg-neutral-100 rounded-lg flex items-center justify-center shrink-0">
                                  <Activity size={24} className="text-neutral-300" />
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <h4 className="font-semibold text-[#121212] text-lg">{ex.name}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-xs text-neutral-500">{ex.equipment.join(', ')}</span>
                                  <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                  <span className="text-xs text-neutral-500">{ex.primaryMuscles.join(', ')}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6 md:px-6 shrink-0">
                                <div className="text-center">
                                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Sets</p>
                                  <p className="font-serif font-bold text-xl text-[#121212]">{pe.sets}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Reps</p>
                                  <p className="font-serif font-bold text-xl text-[#121212]">{pe.reps}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-[#C81D6B] font-bold uppercase tracking-widest mb-1" title="Reps in Reserve">RIR</p>
                                  <p className="font-serif font-bold text-xl text-[#C81D6B]">{pe.rir}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
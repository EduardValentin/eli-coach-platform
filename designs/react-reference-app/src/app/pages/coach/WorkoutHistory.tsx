import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Calendar, Dumbbell, Clock, TrendingUp, Activity, ArrowLeftRight } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe', 'c1': 'Jane Doe', 'c2': 'Jessica Alba', 'c3': 'Emma Stone', 'c4': 'Sarah Jenkins', 'c5': 'Mia Thermopolis'
};

export function WorkoutHistory() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { getClientWorkoutHistory, exercises } = useTraining();

  const dataClientId = clientId === 'c1' ? 'client-1' : clientId || 'client-1';
  const clientName = MOCK_CLIENTS[clientId || ''] || 'Unknown Client';
  const history = getClientWorkoutHistory(dataClientId);

  // Aggregate stats
  const totalSessions = history.length;
  const totalVolume = history.reduce((t, w) => t + (w.totalVolume || 0), 0);
  const totalDuration = history.reduce((t, w) => t + (w.duration || 0), 0);
  const avgVolume = totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0;
  const avgDuration = totalSessions > 0 ? Math.round(totalDuration / 60 / totalSessions) : 0;

  // All exercises across sessions (unique)
  const exerciseFrequency: Record<string, number> = {};
  history.forEach(w => {
    w.exercises.forEach(el => {
      exerciseFrequency[el.exerciseId] = (exerciseFrequency[el.exerciseId] || 0) + 1;
    });
  });
  const topExercises = Object.entries(exerciseFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ exercise: exercises.find(e => e.id === id), count }))
    .filter(e => e.exercise);

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
          <h1 className="text-2xl font-serif font-bold text-[#121212]">Workout History</h1>
          <p className="text-sm text-neutral-500">{clientName}</p>
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-neutral-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Sessions</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{totalSessions}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-[#C81D6B]" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Total Volume</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{totalVolume.toLocaleString()} kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[#00796B]" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Avg Volume</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{avgVolume.toLocaleString()} kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-neutral-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Avg Duration</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{avgDuration} min</p>
        </div>
      </div>

      {/* Most trained exercises */}
      {topExercises.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Most Trained</h3>
          <div className="flex flex-wrap gap-2">
            {topExercises.map(({ exercise, count }) => (
              <span key={exercise!.id} className="text-xs bg-neutral-50 border border-neutral-100 text-[#121212] rounded-full px-3 py-1.5 font-medium">
                {exercise!.name} <span className="text-neutral-400 ml-1">{count}x</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Session list */}
      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">All Sessions</h2>
      {history.length === 0 ? (
        <div className="text-center py-16">
          <Activity size={32} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-400">No completed workouts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map(wl => {
            const durationMin = wl.duration ? Math.round(wl.duration / 60) : 0;
            const dateStr = new Date(wl.startedAt).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric'
            });
            const exerciseNames = wl.exercises
              .map(el => exercises.find(e => e.id === el.exerciseId)?.name)
              .filter(Boolean);
            const hasSwaps = wl.exercises.some(e => e.wasSwapped);
            const totalSets = wl.exercises.reduce((t, e) => t + e.sets.length, 0);
            const completedSets = wl.exercises.reduce((t, e) => t + e.sets.filter(s => s.completed).length, 0);

            // Muscle groups
            const muscles = new Set<string>();
            wl.exercises.forEach(el => {
              const ex = exercises.find(e => e.id === el.exerciseId);
              ex?.primaryMuscles.forEach(m => muscles.add(m));
            });

            return (
              <Link
                key={wl.id}
                to={`/coach/clients/${clientId}/workout/${wl.id}`}
                className="block bg-white rounded-2xl border border-neutral-100 p-5 hover:border-neutral-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">{dateStr}</p>
                    <p className="font-semibold text-[#121212] mt-0.5">
                      {exerciseNames.slice(0, 3).join(', ')}
                      {exerciseNames.length > 3 && <span className="text-neutral-400"> +{exerciseNames.length - 3}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasSwaps && (
                      <span className="text-[8px] bg-[#00796B]/10 text-[#00796B] rounded-full px-1.5 py-0.5 font-bold uppercase">
                        <ArrowLeftRight size={8} className="inline -mt-px" /> Swap
                      </span>
                    )}
                    <span className="text-[8px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-bold uppercase">
                      {completedSets}/{totalSets}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {durationMin} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell size={12} className="text-[#C81D6B]" /> {(wl.totalVolume || 0).toLocaleString()} kg
                  </span>
                </div>

                {/* Muscle pills */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {Array.from(muscles).map(m => (
                    <span key={m} className="text-[9px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5">{m}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useTraining } from '../../context/TrainingContext';
import { Dumbbell, Plus, Search, CalendarDays, Activity, MoreVertical, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { ExerciseModal } from '../../components/coach/ExerciseModal';
import { toast } from 'sonner';

import { useNavigate } from 'react-router';

export function TrainingHub() {
  const { exercises, plans, assignPlanToClient } = useTraining();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'plans' | 'exercises'>('plans');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  // const [isPlanBuilderOpen, setIsPlanBuilderOpen] = useState(false);

  const filteredExercises = exercises.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.primaryMuscles.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#121212]">Training & Programs</h1>
          <p className="text-neutral-500 mt-1">Manage workout plans and exercise library</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (activeTab === 'exercises') {
                setEditingExerciseId(null);
                setIsExerciseModalOpen(true);
              } else {
                navigate('/coach/training/builder');
              }
            }}
            className="px-5 py-2.5 bg-[#C81D6B] text-white rounded-xl font-semibold hover:bg-[#a31556] transition-colors flex items-center gap-2 shadow-md"
          >
            <Plus size={20} />
            {activeTab === 'exercises' ? 'New Exercise' : 'Create Plan'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-neutral-200 mb-6">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-4 px-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'plans' ? 'border-[#C81D6B] text-[#C81D6B]' : 'border-transparent text-neutral-500 hover:text-[#121212]'
          }`}
        >
          Workout Plans
        </button>
        <button
          onClick={() => setActiveTab('exercises')}
          className={`pb-4 px-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'exercises' ? 'border-[#C81D6B] text-[#C81D6B]' : 'border-transparent text-neutral-500 hover:text-[#121212]'
          }`}
        >
          Exercise Library
        </button>
      </div>

      {activeTab === 'plans' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <motion.div 
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-[#00796B]/10 text-[#00796B] rounded-xl flex items-center justify-center">
                  <CalendarDays size={24} />
                </div>
                <button className="text-neutral-400 hover:text-[#121212]">
                  <MoreVertical size={20} />
                </button>
              </div>
              <h3 className="font-semibold text-lg text-[#121212] mb-1">{plan.name}</h3>
              <p className="text-sm text-neutral-500 mb-4">{plan.durationWeeks} Weeks • {plan.assignedClients.length} Clients Assigned</p>
              
              <div className="mt-auto pt-4 border-t border-neutral-50 flex items-center justify-between">
                <span className="text-xs font-medium bg-neutral-100 px-3 py-1 rounded-full text-neutral-600">
                  {plan.weeks[0]?.days.filter(d => d.type !== 'Rest').length || 0} days/week
                </span>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      assignPlanToClient(plan.id, 'client-1');
                      toast.success(`Assigned ${plan.name} to active client.`);
                    }}
                    className="text-sm font-semibold text-[#121212] hover:text-[#C81D6B]"
                  >
                    Assign
                  </button>
                <button 
                  onClick={() => navigate('/coach/training/builder')}
                  className="text-sm font-semibold text-[#00796B] hover:text-[#005a4f] bg-white px-4 py-1.5 rounded-lg border border-neutral-200"
                >
                  Edit Plan
                </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Search exercises by name or muscle..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C81D6B]/20 focus:border-[#C81D6B] transition-all text-sm"
            />
          </div>
          
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="p-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Exercise</th>
                  <th className="p-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Target Muscles</th>
                  <th className="p-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Difficulty</th>
                  <th className="p-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Video</th>
                  <th className="p-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExercises.map(exercise => (
                  <tr key={exercise.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-500 shrink-0">
                          <Activity size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#121212]">{exercise.name}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-[200px]">{exercise.equipment.join(', ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {exercise.primaryMuscles.map(m => (
                          <span key={m} className="text-[10px] font-medium bg-[#00796B]/10 text-[#00796B] px-2 py-0.5 rounded-full">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                        exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                        exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </td>
                    <td className="p-4">
                      {exercise.videoUrl ? (
                        <div className="text-[#C81D6B] flex items-center gap-1 text-xs font-medium">
                          <PlayCircle size={16} /> Attached
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">None</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => {
                          setEditingExerciseId(exercise.id);
                          setIsExerciseModalOpen(true);
                        }}
                        className="text-sm font-semibold text-[#00796B] hover:text-[#005a4f]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredExercises.length === 0 && (
              <div className="p-8 text-center text-neutral-500 text-sm">
                No exercises found matching your search.
              </div>
            )}
          </div>
        </div>
      )}

      <ExerciseModal 
        isOpen={isExerciseModalOpen} 
        onClose={() => setIsExerciseModalOpen(false)} 
        exerciseId={editingExerciseId}
      />
    </div>
  );
}
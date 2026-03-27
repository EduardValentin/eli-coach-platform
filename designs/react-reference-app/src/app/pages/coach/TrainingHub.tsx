import { useState } from 'react';
import { useTraining, Plan } from '../../context/TrainingContext';
import { Plus, Search, CalendarDays, Activity, PlayCircle, Users, Pencil, UserPlus, Check, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction
} from '../../components/ui/alert-dialog';
import { ExerciseModal } from '../../components/coach/ExerciseModal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';

const MOCK_CLIENTS = [
  { id: 'c1', name: 'Jane Doe', avatar: 'JD' },
  { id: 'c2', name: 'Jessica Alba', avatar: 'JA' },
  { id: 'c3', name: 'Emma Stone', avatar: 'ES' },
  { id: 'c4', name: 'Sarah Jenkins', avatar: 'SJ' },
  { id: 'c5', name: 'Mia Thermopolis', avatar: 'MT' },
];

function PlanCard({ plan, onAssign, onEdit, onDelete }: { plan: Plan; onAssign: (planId: string, clientId: string, clientName: string) => void; onEdit: () => void; onDelete: (planId: string, planName: string) => void }) {
  const isDraft = plan.name.includes('(Draft)');
  const displayName = plan.name.replace(' (Draft)', '');
  const trainingDays = plan.weeks[0]?.days.filter(d => d.type !== 'Rest').length || 0;
  const [clientSearch, setClientSearch] = useState('');

  const filteredClients = MOCK_CLIENTS.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden ${
        isDraft ? 'border-amber-200' : 'border-neutral-100'
      }`}
    >
      {/* Draft banner */}
      {isDraft && (
        <div className="bg-amber-50 px-5 py-2 flex items-center gap-2 border-b border-amber-200">
          <FileText size={14} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Draft</span>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            isDraft ? 'bg-amber-100 text-amber-600' : 'bg-[#00796B]/10 text-[#00796B]'
          }`}>
            <CalendarDays size={22} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-neutral-100 px-2.5 py-1 rounded-full text-neutral-600">
              {trainingDays} days/week
            </span>
            <button
              onClick={() => onDelete(plan.id, displayName)}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete plan"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Plan info */}
        <h3 className="font-semibold text-lg text-[#121212] mb-1 leading-snug">{displayName}</h3>
        <p className="text-sm text-neutral-500 mb-4">
          {plan.durationWeeks} Weeks
        </p>

        {/* Assigned clients */}
        {plan.assignedClients.length > 0 ? (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {plan.assignedClients.slice(0, 3).map((clientId) => {
                const client = MOCK_CLIENTS.find(c => c.id === clientId);
                return (
                  <div key={clientId} className="w-7 h-7 rounded-full bg-[#C81D6B] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {client?.avatar || '?'}
                  </div>
                );
              })}
              {plan.assignedClients.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-600 text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  +{plan.assignedClients.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-neutral-500">
              {plan.assignedClients.length} {plan.assignedClients.length === 1 ? 'client' : 'clients'}
            </span>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 mb-4">No clients assigned</p>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[#121212] bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200">
                <UserPlus size={16} />
                Assign
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-neutral-100">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Assign to client</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#C81D6B]"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filteredClients.map(client => {
                  const isAssigned = plan.assignedClients.includes(client.id);
                  return (
                    <button
                      key={client.id}
                      onClick={() => onAssign(plan.id, client.id, client.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isAssigned ? 'bg-[#C81D6B]/5' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isAssigned ? 'bg-[#C81D6B] text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {client.avatar}
                      </div>
                      <span className="text-sm font-medium text-[#121212] flex-1">{client.name}</span>
                      {isAssigned && (
                        <Check size={16} className="text-[#C81D6B] shrink-0" />
                      )}
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <p className="text-center text-xs text-neutral-400 py-4">No clients found</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#121212] hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <Pencil size={16} />
            Edit
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function TrainingHub() {
  const { exercises, plans, assignPlanToClient, deletePlan } = useTraining();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'plans' | 'exercises'>('plans');
  const [searchQuery, setSearchQuery] = useState('');

  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleAssign = (planId: string, clientId: string, clientName: string) => {
    assignPlanToClient(planId, clientId);
    toast.success(`Assigned plan to ${clientName}`);
  };

  const handleDeleteRequest = (planId: string, planName: string) => {
    setDeleteTarget({ id: planId, name: planName });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deletePlan(deleteTarget.id);
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

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
            <PlanCard
              key={plan.id}
              plan={plan}
              onAssign={handleAssign}
              onEdit={() => navigate('/coach/training/builder')}
              onDelete={handleDeleteRequest}
            />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-[#121212]">
              Delete this plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-semibold text-[#121212]">"{deleteTarget?.name}"</span> will be permanently removed. Any clients assigned to this plan will be unassigned. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold shadow-sm"
            >
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from 'react';
import { useTraining, PlanTemplate, PlanInstance } from '../../context/TrainingContext';
import { Plus, Search, CalendarDays, Activity, PlayCircle, Users, Pencil, UserPlus, Check, FileText, Trash2, AlertTriangle, Target, ChevronDown, Copy, Clock, MoreVertical, Eye, User } from 'lucide-react';
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
  { id: 'client-1', name: 'Jane Doe', avatar: 'JD' },
  { id: 'c2', name: 'Jessica Alba', avatar: 'JA' },
  { id: 'c3', name: 'Emma Stone', avatar: 'ES' },
  { id: 'c4', name: 'Sarah Jenkins', avatar: 'SJ' },
  { id: 'c5', name: 'Mia Thermopolis', avatar: 'MT' },
];

// ── Plan Instance Card ──────────────────────────────────────────

function PlanInstanceCard({ instance, onClick, onGoToClient, onDelete }: {
  instance: PlanInstance;
  onClick: () => void;
  onGoToClient: () => void;
  onDelete: () => void;
}) {
  const { goals } = useTraining();
  const goal = goals.find(g => g.id === instance.goalId);
  const client = MOCK_CLIENTS.find(c => c.id === instance.clientId);
  const trainingDays = instance.weeks[0]?.days.filter(d => d.type !== 'Rest').length || 0;
  const isCompleted = instance.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`rounded-2xl flex flex-col relative cursor-pointer transition-all duration-150 ${
        isCompleted
          ? 'bg-neutral-50 border border-dashed border-neutral-200 hover:border-neutral-300'
          : 'bg-white shadow-sm border border-neutral-200 hover:shadow-md hover:border-neutral-300'
      }`}
    >
      {/* Completed badge — green checkmark pill floating at top */}
      {isCompleted && (
        <div className="absolute -top-2.5 left-4 z-10 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
          <Check size={11} className="text-emerald-600" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Completed</span>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Client info + 3-dot menu */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center ring-2 ring-white ${
            isCompleted
              ? 'bg-neutral-300 text-neutral-500'
              : 'bg-[#C81D6B] text-white shadow-sm'
          }`}>
            {client?.avatar || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm truncate ${isCompleted ? 'text-neutral-500' : 'text-[#121212]'}`}>
              {client?.name || 'Unknown'}
            </p>
            <p className={`text-xs truncate ${isCompleted ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {instance.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isCompleted ? 'bg-neutral-100 text-neutral-400' : 'bg-neutral-100 text-neutral-600'
            }`}>
              {trainingDays}d/wk
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-50">
                <button
                  onClick={(e) => { e.stopPropagation(); onGoToClient(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-neutral-50 transition-colors"
                >
                  <User size={15} className="text-neutral-500" />
                  <span className="text-sm font-medium text-[#121212]">Go to Client</span>
                </button>
                <div className="my-1 border-t border-neutral-100" />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} className="text-red-500" />
                  <span className="text-sm font-medium text-red-600">Delete Plan</span>
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Goal badge */}
        {goal && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold mb-3 self-start ${
            isCompleted
              ? 'bg-neutral-100 text-neutral-400'
              : 'bg-[#00796B]/10 text-[#00796B]'
          }`}>
            <Target size={12} />
            {goal.name}
          </div>
        )}

        {/* Week progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-medium ${isCompleted ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {isCompleted
                ? `${instance.weeks.length} weeks completed`
                : `Week ${instance.currentWeekNumber} of ${instance.weeks.length}`}
            </span>
            {instance.weeks.some(w => w.isDeload) && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isCompleted ? 'text-neutral-400 bg-neutral-100' : 'text-blue-600 bg-blue-50'
              }`}>
                Has Deload
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {instance.weeks.map((week, i) => (
              <div
                key={week.id}
                className={`h-2 flex-1 rounded-full ${
                  isCompleted
                    ? 'bg-neutral-200'
                    : i < instance.currentWeekNumber - 1
                      ? 'bg-[#C81D6B]'
                      : i === instance.currentWeekNumber - 1
                        ? 'bg-[#C81D6B]/50'
                        : 'bg-neutral-100'
                } ${!isCompleted && week.isDeload ? 'ring-1 ring-blue-300' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Date info */}
        <p className={`text-xs ${isCompleted ? 'text-neutral-400' : 'text-neutral-400'}`}>
          Started {instance.startDate}
          {instance.endDate && ` · Ended ${instance.endDate}`}
        </p>
      </div>
    </motion.div>
  );
}

// ── Template Card ───────────────────────────────────────────────

function TemplateCard({ template, onEdit, onStartPlan, onDelete }: {
  template: PlanTemplate;
  onEdit: () => void;
  onStartPlan: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const trainingDays = template.weeks[0]?.days.filter(d => d.type !== 'Rest').length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-neutral-100 flex flex-col overflow-hidden"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-[#00796B]/10 text-[#00796B] flex items-center justify-center">
            <CalendarDays size={22} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-neutral-100 px-2.5 py-1 rounded-full text-neutral-600">
              {trainingDays} days/week
            </span>
            <button
              onClick={() => onDelete(template.id, template.name)}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete template"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <h3 className="font-semibold text-lg text-[#121212] mb-1 leading-snug">{template.name}</h3>
        {template.description && (
          <p className="text-sm text-neutral-500 mb-2 line-clamp-2">{template.description}</p>
        )}
        <p className="text-sm text-neutral-400 mb-3">{template.weeks.length} {template.weeks.length === 1 ? 'Week' : 'Weeks'}</p>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.map(tag => (
              <span key={tag} className="text-[10px] font-medium bg-[#00796B]/10 text-[#00796B] px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center gap-2">
          <button
            onClick={onStartPlan}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[#121212] bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200"
          >
            <Copy size={16} />
            Start Plan
          </button>
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

// ── Main Hub ────────────────────────────────────────────────────

export function TrainingHub() {
  const { exercises, planTemplates, planInstances, deleteTemplate, createPlanInstance, goals } = useTraining();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'instances' | 'templates' | 'exercises'>('instances');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'template' | 'plan' } | null>(null);

  // Start plan from template - client selection
  const [startPlanTemplateId, setStartPlanTemplateId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // New plan - client selection (no template required)
  const [showNewPlanClientPicker, setShowNewPlanClientPicker] = useState(false);
  const [newPlanClientSearch, setNewPlanClientSearch] = useState('');

  const handleDeleteRequest = (id: string, name: string, type: 'template' | 'plan' = 'template') => setDeleteTarget({ id, name, type });

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'template') {
      deleteTemplate(deleteTarget.id);
    } else {
      // Plan instance deletion — in a real app this would call deletePlanInstance
      toast.info('Plan deletion would be handled here');
    }
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const handleStartPlanFromTemplate = (clientId: string, clientName: string) => {
    if (!startPlanTemplateId) return;
    const template = planTemplates.find(t => t.id === startPlanTemplateId);
    if (!template) return;

    // Find or create an active goal for this client
    const activeGoal = goals.find(g => g.clientId === clientId && g.status === 'active');
    const goalId = activeGoal?.id || 'goal-placeholder';

    const instance = createPlanInstance(clientId, goalId, `${template.name} - ${clientName}`, startPlanTemplateId);
    toast.success(`Plan started for ${clientName}`);
    setStartPlanTemplateId(null);
    setClientSearch('');
    navigate(`/coach/training/builder/${clientId}`);
  };

  const filteredInstances = planInstances.filter(p => {
    if (statusFilter === 'active' && p.status !== 'active') return false;
    if (statusFilter === 'completed' && p.status !== 'completed') return false;
    return true;
  });

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.primaryMuscles.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredClients = MOCK_CLIENTS.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleCreate = () => {
    if (activeTab === 'exercises') {
      setEditingExerciseId(null);
      setIsExerciseModalOpen(true);
    } else if (activeTab === 'templates') {
      navigate('/coach/training/template-builder');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#121212]">Training & Programs</h1>
          <p className="text-neutral-500 mt-1">Manage client plans, templates, and exercises</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'instances' ? (
            <button
              onClick={() => { setNewPlanClientSearch(''); setShowNewPlanClientPicker(true); }}
              className="px-5 py-2.5 bg-[#C81D6B] text-white rounded-xl font-semibold hover:bg-[#a31556] transition-colors flex items-center gap-2 shadow-md"
            >
              <Plus size={20} />
              New Client Plan
            </button>
          ) : (
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-[#C81D6B] text-white rounded-xl font-semibold hover:bg-[#a31556] transition-colors flex items-center gap-2 shadow-md"
            >
              <Plus size={20} />
              {activeTab === 'exercises' ? 'New Exercise' : 'New Template'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-neutral-200 mb-6">
        {[
          { key: 'instances' as const, label: 'Client Plans', count: planInstances.filter(p => p.status === 'active').length },
          { key: 'templates' as const, label: 'Templates', count: planTemplates.length },
          { key: 'exercises' as const, label: 'Exercise Library' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 px-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === tab.key ? 'border-[#C81D6B] text-[#C81D6B]' : 'border-transparent text-neutral-500 hover:text-[#121212]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-[#C81D6B]/10 text-[#C81D6B]' : 'bg-neutral-100 text-neutral-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Client Plans tab ─── */}
      {activeTab === 'instances' && (
        <>
          <div className="flex items-center gap-2 mb-6">
            {(['all', 'active', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === f
                    ? 'bg-[#121212] text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filteredInstances.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInstances.map(instance => (
                <PlanInstanceCard
                  key={instance.id}
                  instance={instance}
                  onClick={() => navigate(`/coach/training/builder/${instance.clientId}`)}
                  onGoToClient={() => navigate(`/coach/clients/${instance.clientId}`)}
                  onDelete={() => handleDeleteRequest(instance.id, instance.name, 'plan')}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-neutral-500">
              <Users size={32} className="mx-auto mb-3 text-neutral-300" />
              <p className="text-sm">No client plans yet. Start one from a template or create from scratch.</p>
            </div>
          )}
        </>
      )}

      {/* ── Templates tab ─── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => navigate(`/coach/training/template-builder/${template.id}`)}
              onStartPlan={() => setStartPlanTemplateId(template.id)}
              onDelete={handleDeleteRequest}
            />
          ))}
          {planTemplates.length === 0 && (
            <div className="col-span-full text-center py-16 text-neutral-500">
              <FileText size={32} className="mx-auto mb-3 text-neutral-300" />
              <p className="text-sm">No templates yet. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Exercise Library tab ─── */}
      {activeTab === 'exercises' && (
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
              Delete this {deleteTarget?.type === 'plan' ? 'plan' : 'template'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-semibold text-[#121212]">"{deleteTarget?.name}"</span> will be permanently removed. This action cannot be undone.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Plan from Template - Client Selection */}
      <AlertDialog open={!!startPlanTemplateId} onOpenChange={(open) => !open && setStartPlanTemplateId(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#121212]">Start plan for client</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a client to create a personalized plan from this template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#C81D6B]"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleStartPlanFromTemplate(client.id, client.name)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {client.avatar}
                  </div>
                  <span className="text-sm font-medium text-[#121212]">{client.name}</span>
                </button>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Client Plan - Client Selection (no template required) */}
      <AlertDialog open={showNewPlanClientPicker} onOpenChange={(open) => !open && setShowNewPlanClientPicker(false)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#121212]">Create plan for client</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a client to start building a new plan. You can optionally use a template inside the builder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input
                type="text"
                placeholder="Search clients..."
                value={newPlanClientSearch}
                onChange={e => setNewPlanClientSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#C81D6B]"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {MOCK_CLIENTS.filter(c => c.name.toLowerCase().includes(newPlanClientSearch.toLowerCase())).map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    setShowNewPlanClientPicker(false);
                    setNewPlanClientSearch('');
                    navigate(`/coach/training/builder/${client.id}`);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#C81D6B] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {client.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#121212]">{client.name}</span>
                    {planInstances.some(p => p.clientId === client.id && p.status === 'active') && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        Has active plan
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from 'react';
import {
  useTraining,
  PlanTemplate,
  PlanInstance,
} from '../../context/TrainingContext';
import {
  Plus,
  Search,
  CalendarDays,
  Activity,
  PlayCircle,
  Users,
  Pencil,
  UserPlus,
  Check,
  FileText,
  Trash2,
  AlertTriangle,
  Target,
  ChevronDown,
  Copy,
  Clock,
  MoreVertical,
  Eye,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ExerciseModal } from '../../components/coach-portal/ExerciseModal';
import { ExerciseFilters } from '../../components/coach-portal/ExerciseFilters';
import { RowActionButton } from '../../components/RowActionButton';
import { SearchField } from '../../components/SearchField';
import {
  matchesExerciseFilters,
  type ExerciseFilter,
} from '../../utils/exerciseFilters';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../components/ui/popover';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { FilterChipGroup, FilterChip } from '../../components/FilterChipGroup';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../components/ui/utils';
import {
  WIDGET_TITLE_CLASS,
  LABEL_CLASS,
  VALUE_CLASS,
} from '../../components/typography';

const MOCK_CLIENTS = [
  { id: 'client-1', name: 'Jane Doe', avatar: 'JD' },
  { id: 'c2', name: 'Jessica Alba', avatar: 'JA' },
  { id: 'c3', name: 'Emma Stone', avatar: 'ES' },
  { id: 'c4', name: 'Sarah Jenkins', avatar: 'SJ' },
  { id: 'c5', name: 'Mia Thermopolis', avatar: 'MT' },
];

// ── Plan Instance Card ──────────────────────────────────────────

function PlanInstanceCard({
  instance,
  onClick,
  onGoToClient,
  onDelete,
}: {
  instance: PlanInstance;
  onClick: () => void;
  onGoToClient: () => void;
  onDelete: () => void;
}) {
  const { goals } = useTraining();
  const goal = goals.find((g) => g.id === instance.goalId);
  const client = MOCK_CLIENTS.find((c) => c.id === instance.clientId);
  const trainingDays =
    instance.weeks[0]?.days.filter((d) => d.type !== 'Rest').length || 0;
  const isCompleted = instance.status === 'completed';

  const weekCount = instance.weeks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`rounded-card flex flex-col relative cursor-pointer transition-all duration-150 ${
        isCompleted
          ? 'bg-muted/40 border border-dashed border-border hover:border-muted-foreground/30'
          : 'bg-card shadow-card border border-border hover:shadow-card hover:border-muted-foreground/30'
      }`}
    >
      {isCompleted && (
        <Badge tone="success" className="absolute -top-2.5 left-4 z-10">
          <Check size={11} />
          Completed
        </Badge>
      )}

      <div className="p-6 flex-1 flex flex-col">
        {/* Client info + 3-dot menu */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            className={cn('ring-2 ring-card', !isCompleted && 'shadow-card')}
          >
            <AvatarFallback
              className={
                isCompleted
                  ? 'bg-muted text-text-secondary'
                  : 'bg-primary text-primary-foreground'
              }
            >
              {client?.avatar || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p
              title={client?.name || 'Unknown'}
              className={cn(
                WIDGET_TITLE_CLASS,
                'truncate',
                isCompleted && 'text-text-secondary',
              )}
            >
              {client?.name || 'Unknown'}
            </p>
            <p
              title={instance.name}
              className="text-xs truncate text-text-secondary"
            >
              {instance.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge tone="muted" className="whitespace-nowrap">
              {trainingDays}d/wk
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  onClick={(e) => e.stopPropagation()}
                  variant="ghost"
                  size="icon-sm"
                  className="size-8"
                >
                  <MoreVertical size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-48 p-1.5 bg-popover border border-border rounded-control shadow-xl z-50"
              >
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToClient();
                  }}
                  variant="ghost"
                  className="w-full justify-start gap-2.5 px-3"
                >
                  <User size={15} className="text-text-secondary" />
                  <span className="text-sm font-medium text-text-primary">
                    Go to Client
                  </span>
                </Button>
                <div className="my-1 border-t border-border" />
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  variant="ghost"
                  className="w-full justify-start gap-2.5 px-3 hover:bg-destructive/10"
                >
                  <Trash2 size={15} className="text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Delete Plan
                  </span>
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Goal badge */}
        {goal && (
          <Badge
            tone={isCompleted ? 'muted' : 'brand-secondary'}
            className="mb-3 self-start"
          >
            <Target size={12} />
            {goal.type}
          </Badge>
        )}

        {/* Week progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
              {isCompleted
                ? `${weekCount} ${weekCount === 1 ? 'week' : 'weeks'}`
                : `Week ${instance.currentWeekNumber} of ${weekCount}`}
            </span>
            {instance.weeks.some((w) => w.isDeload) && (
              <Badge
                tone={isCompleted ? 'muted' : 'brand-secondary'}
                className="whitespace-nowrap"
              >
                Has deload
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {instance.weeks.map((week, i) => (
              <div
                key={week.id}
                className={`h-2 flex-1 rounded-full ${
                  isCompleted
                    ? 'bg-muted'
                    : i < instance.currentWeekNumber - 1
                      ? 'bg-primary'
                      : i === instance.currentWeekNumber - 1
                        ? 'bg-primary/50'
                        : 'bg-muted'
                } ${!isCompleted && week.isDeload ? 'ring-1 ring-brand-secondary/40' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Date info */}
        <p className="text-xs text-text-secondary">
          Started {instance.startDate}
          {instance.endDate && ` · Ended ${instance.endDate}`}
        </p>
      </div>
    </motion.div>
  );
}

// ── Template Card ───────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onStartPlan,
  onDelete,
}: {
  template: PlanTemplate;
  onEdit: () => void;
  onStartPlan: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const trainingDays =
    template.weeks[0]?.days.filter((d) => d.type !== 'Rest').length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-card shadow-card border border-border-subtle flex flex-col overflow-hidden"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-control bg-brand-secondary-soft text-brand-secondary flex items-center justify-center">
            <CalendarDays size={22} />
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="muted">{trainingDays} days/week</Badge>
            <Button
              onClick={() => onDelete(template.id, template.name)}
              variant="ghost"
              size="icon-sm"
              className="size-8 text-icon-muted hover:bg-destructive/10 hover:text-destructive"
              title="Delete template"
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>

        <h3 className={cn(WIDGET_TITLE_CLASS, 'mb-1 leading-snug')}>
          {template.name}
        </h3>
        {template.description && (
          <p className="text-sm text-text-secondary mb-2 line-clamp-2">
            {template.description}
          </p>
        )}
        <p className="text-sm text-text-secondary mb-3">
          {template.weeks.length}{' '}
          {template.weeks.length === 1 ? 'Week' : 'Weeks'}
        </p>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.map((tag) => (
              <Badge key={tag} tone="brand-secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-border-subtle flex items-center gap-2">
          <Button onClick={onStartPlan} variant="outline" className="flex-1">
            <Copy size={16} />
            Start Plan
          </Button>
          <Button onClick={onEdit} variant="primary" className="flex-1">
            <Pencil size={16} />
            Edit
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Hub ────────────────────────────────────────────────────

export function TrainingHub() {
  const {
    exercises,
    planTemplates,
    planInstances,
    deleteTemplate,
    createPlanInstance,
    goals,
  } = useTraining();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'instances' | 'templates' | 'exercises'
  >('instances');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'completed'
  >('all');
  const [activeFilters, setActiveFilters] = useState<ExerciseFilter[]>([]);

  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null,
  );

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: 'template' | 'plan';
  } | null>(null);

  // Start plan from template - client selection
  const [startPlanTemplateId, setStartPlanTemplateId] = useState<string | null>(
    null,
  );
  const [clientSearch, setClientSearch] = useState('');

  // New plan - client selection (no template required)
  const [showNewPlanClientPicker, setShowNewPlanClientPicker] = useState(false);
  const [newPlanClientSearch, setNewPlanClientSearch] = useState('');

  const handleDeleteRequest = (
    id: string,
    name: string,
    type: 'template' | 'plan' = 'template',
  ) => setDeleteTarget({ id, name, type });

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

  const handleStartPlanFromTemplate = (
    clientId: string,
    clientName: string,
  ) => {
    if (!startPlanTemplateId) return;
    const template = planTemplates.find((t) => t.id === startPlanTemplateId);
    if (!template) return;

    // Find or create an active goal for this client
    const activeGoal = goals.find(
      (g) => g.clientId === clientId && g.status === 'active',
    );
    const goalId = activeGoal?.id || 'goal-placeholder';

    const instance = createPlanInstance(
      clientId,
      goalId,
      `${template.name} - ${clientName}`,
      startPlanTemplateId,
    );
    toast.success(`Plan started for ${clientName}`);
    setStartPlanTemplateId(null);
    setClientSearch('');
    navigate(`/coach/training/builder/${clientId}`);
  };

  const filteredInstances = planInstances.filter((p) => {
    if (statusFilter === 'active' && p.status !== 'active') return false;
    if (statusFilter === 'completed' && p.status !== 'completed') return false;
    return true;
  });

  const toggleFilter = (filter: ExerciseFilter) =>
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((active) => active !== filter)
        : [...prev, filter],
    );

  const clearFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
  };

  const filteredExercises = exercises.filter((exercise) =>
    matchesExerciseFilters({ exercise, searchQuery, activeFilters }),
  );

  const filteredClients = MOCK_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()),
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
    <div className="w-full">
      <PortalPageHeader
        title="Training & Programs"
        subtitle="Manage client plans, templates, and exercises."
        actions={
          activeTab === 'instances' ? (
            <Button
              onClick={() => {
                setNewPlanClientSearch('');
                setShowNewPlanClientPicker(true);
              }}
              variant="primary"
              size="md"
              className="shadow-card"
            >
              <Plus size={20} />
              New Client Plan
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              variant="primary"
              size="md"
              className="shadow-card"
            >
              <Plus size={20} />
              {activeTab === 'exercises' ? 'New Exercise' : 'New Template'}
            </Button>
          )
        }
      />

      <Tabs
        variant="segmented"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="w-full"
      >
        <div className="mb-6 flex flex-col gap-2">
          <TabsList>
            <TabsTrigger value="instances">
              Client Plans
            </TabsTrigger>
            <TabsTrigger value="templates">
              Templates
            </TabsTrigger>
            <TabsTrigger value="exercises">
              Exercise Library
            </TabsTrigger>
          </TabsList>
          {activeTab === 'instances' && (
            <p className="text-sm text-text-secondary">
              {planInstances.filter((p) => p.status === 'active').length} active
              plans
            </p>
          )}
          {activeTab === 'templates' && (
            <p className="text-sm text-text-secondary">
              {planTemplates.length}{' '}
              {planTemplates.length === 1 ? 'template' : 'templates'}
            </p>
          )}
        </div>

        {/* ── Client Plans tab ─── */}
        {activeTab === 'instances' && (
          <>
            <div className="mb-6 flex flex-col gap-2">
              <span className={LABEL_CLASS}>Status</span>
              <FilterChipGroup
                aria-label="Filter plans by status"
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter((value as typeof statusFilter) ?? 'all')
                }
              >
                {(['all', 'active', 'completed'] as const).map((f) => (
                  <FilterChip key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </FilterChip>
                ))}
              </FilterChipGroup>
            </div>

            {filteredInstances.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {filteredInstances.map((instance) => (
                  <PlanInstanceCard
                    key={instance.id}
                    instance={instance}
                    onClick={() =>
                      navigate(`/coach/training/builder/${instance.clientId}`)
                    }
                    onGoToClient={() =>
                      navigate(`/coach/clients/${instance.clientId}`)
                    }
                    onDelete={() =>
                      handleDeleteRequest(instance.id, instance.name, 'plan')
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No client plans yet"
                description="Start one from a template or create from scratch."
              />
            )}
          </>
        )}

        {/* ── Templates tab ─── */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() =>
                  navigate(`/coach/training/template-builder/${template.id}`)
                }
                onStartPlan={() => setStartPlanTemplateId(template.id)}
                onDelete={handleDeleteRequest}
              />
            ))}
            {planTemplates.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  icon={FileText}
                  title="No templates yet"
                  description="Create one to get started."
                />
              </div>
            )}
          </div>
        )}

        {/* ── Exercise Library tab ─── */}
        {activeTab === 'exercises' && (
          <div>
            <SearchField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises by name or muscle..."
              className="mb-4 max-w-md"
            />

            <div className="mb-6">
              <ExerciseFilters
                activeFilters={activeFilters}
                onToggleFilter={toggleFilter}
                onClearFilters={clearFilters}
              />
            </div>

            <div className="bg-card rounded-card border border-border overflow-x-auto shadow-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-quiet px-3 border-b border-border rounded-field">
                    <th className={cn('p-4', LABEL_CLASS)}>Exercise</th>
                    <th className={cn('p-4', LABEL_CLASS)}>Target Muscles</th>
                    <th className={cn('p-4', LABEL_CLASS)}>Difficulty</th>
                    <th className={cn('p-4', LABEL_CLASS)}>Video</th>
                    <th className={cn('p-4 text-right', LABEL_CLASS)}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExercises.map((exercise) => (
                    <tr
                      key={exercise.id}
                      className="px-3 border-b border-border-subtle rounded-field hover:bg-surface-muted transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-surface-quiet rounded-compact flex items-center justify-center text-text-secondary shrink-0">
                            <Activity size={20} />
                          </div>
                          <div>
                            <p className={VALUE_CLASS}>{exercise.name}</p>
                            <p className="text-xs text-text-secondary truncate max-w-[200px]">
                              {exercise.equipment.join(', ')}
                            </p>
                            {exercise.tags && exercise.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {exercise.tags.map((tag) => (
                                  <Badge key={tag} tone="brand-secondary">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {exercise.primaryMuscles.map((m) => (
                            <Badge key={m} tone="brand-secondary">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          tone={
                            exercise.difficulty === 'Beginner'
                              ? 'success'
                              : exercise.difficulty === 'Intermediate'
                                ? 'pending'
                                : 'outline'
                          }
                          className={
                            exercise.difficulty === 'Advanced'
                              ? 'border-destructive/20 bg-destructive/10 text-destructive'
                              : undefined
                          }
                        >
                          {exercise.difficulty}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {exercise.videoUrl ? (
                          <div className="text-primary flex items-center gap-1 text-xs font-medium">
                            <PlayCircle size={16} /> Attached
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary">
                            None
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <RowActionButton
                          onClick={() => {
                            setEditingExerciseId(exercise.id);
                            setIsExerciseModalOpen(true);
                          }}
                        >
                          Edit
                        </RowActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredExercises.length === 0 && (
                <EmptyState
                  icon={Search}
                  title="No exercises match your search and filters."
                  description="Try a different search term or clear your filters."
                  action={
                    (activeFilters.length > 0 || Boolean(searchQuery)) && (
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={clearFilters}
                      >
                        Clear search and filters
                      </Button>
                    )
                  }
                />
              )}
            </div>
          </div>
        )}
      </Tabs>

      <ExerciseModal
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        exerciseId={editingExerciseId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md rounded-card">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle size={24} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-text-primary">
              Delete this {deleteTarget?.type === 'plan' ? 'plan' : 'template'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-medium text-text-primary">
                "{deleteTarget?.name}"
              </span>{' '}
              will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              variant="destructive"
              className="flex-1"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Plan from Template - Client Selection */}
      <AlertDialog
        open={!!startPlanTemplateId}
        onOpenChange={(open) => !open && setStartPlanTemplateId(null)}
      >
        <AlertDialogContent className="sm:max-w-md rounded-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">
              Start plan for client
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose a client to create a personalized plan from this template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <SearchField
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="mb-3"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredClients.map((client) => (
                <Button
                  key={client.id}
                  onClick={() =>
                    handleStartPlanFromTemplate(client.id, client.name)
                  }
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3"
                >
                  <Avatar size="sm">
                    <AvatarFallback>{client.avatar}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-text-primary">
                    {client.name}
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Client Plan - Client Selection (no template required) */}
      <AlertDialog
        open={showNewPlanClientPicker}
        onOpenChange={(open) => !open && setShowNewPlanClientPicker(false)}
      >
        <AlertDialogContent className="sm:max-w-md rounded-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">
              Create plan for client
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose a client to start building a new plan. You can optionally
              use a template inside the builder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <SearchField
              value={newPlanClientSearch}
              onChange={(e) => setNewPlanClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="mb-3"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {MOCK_CLIENTS.filter((c) =>
                c.name
                  .toLowerCase()
                  .includes(newPlanClientSearch.toLowerCase()),
              ).map((client) => (
                <Button
                  key={client.id}
                  onClick={() => {
                    setShowNewPlanClientPicker(false);
                    setNewPlanClientSearch('');
                    navigate(`/coach/training/builder/${client.id}`);
                  }}
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {client.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary">
                      {client.name}
                    </span>
                    {planInstances.some(
                      (p) => p.clientId === client.id && p.status === 'active',
                    ) && (
                      <Badge tone="pending" className="ml-2">
                        Has active plan
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

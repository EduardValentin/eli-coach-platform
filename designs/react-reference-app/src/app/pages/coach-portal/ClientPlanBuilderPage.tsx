import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, FileText, Target, Calendar, Eye, X } from 'lucide-react';
import {
  useTraining,
  PlanWeek,
  DayType,
  PlanInstance,
  PlanTemplate,
} from '../../context/TrainingContext';
import { useProgramDelivery } from '../../hooks/useProgramDelivery';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import { useMessaging } from '../../context/MessagingContext';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router';
import { PlanBuilder } from '../../components/coach-portal/PlanBuilder';
import { RirBadge } from '../../components/workout/RirBadge';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { WIDGET_TITLE_CLASS, LABEL_CLASS } from '../../components/typography';

// ── Constants ────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe',
  c2: 'Jessica Alba',
  c3: 'Emma Stone',
  c4: 'Sarah Jenkins',
  c5: 'Mia Thermopolis',
};

function getDayTypeBadgeClass(type: DayType) {
  switch (type) {
    case 'Strength':
      return 'border-training-strength/20 bg-training-strength-soft text-training-strength';
    case 'Hypertrophy':
      return 'border-training-hypertrophy/20 bg-training-hypertrophy-soft text-training-hypertrophy';
    case 'Recovery':
      return 'border-training-recovery/20 bg-training-recovery-soft text-training-recovery';
    case 'Lighter':
      return 'border-training-lighter/20 bg-training-lighter-soft text-training-lighter';
    default:
      return 'border-training-rest/20 bg-training-rest-soft text-training-rest';
  }
}

// ── Deep clone helper ────────────────────────────────────────────────

function deepCloneWeeks(sourceWeeks: PlanWeek[]): PlanWeek[] {
  const cloned = JSON.parse(JSON.stringify(sourceWeeks)) as PlanWeek[];
  cloned.forEach((w) => {
    w.id = `cpb-w-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ssMap = new Map<string, string>();
    w.days.forEach((d) => {
      d.id = `cpb-d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      d.exercises.forEach((e) => {
        e.id = `cpb-pe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (e.supersetId) {
          if (!ssMap.has(e.supersetId)) {
            ssMap.set(
              e.supersetId,
              `cpb-ss-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
          }
          e.supersetId = ssMap.get(e.supersetId);
        }
      });
    });
  });
  return cloned;
}

function makeEmptyWeek(order: number, isDeload: boolean = false): PlanWeek {
  const ts = Date.now();
  return {
    id: `cpb-w-${ts}-${Math.random().toString(36).slice(2)}`,
    order,
    isDeload,
    days: Array.from({ length: 7 }).map((_, j) => ({
      id: `cpb-d-${ts}-${j}-${Math.random().toString(36).slice(2)}`,
      dayOfWeek: j,
      type: 'Rest' as DayType,
      exercises: [],
    })),
  };
}

// ── Main Page Component ──────────────────────────────────────────────

export function ClientPlanBuilderPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const {
    exercises,
    planTemplates,
    getClientActivePlan,
    updatePlanInstance,
    createPlanInstance,
    getClientActiveGoal,
    goals,
  } = useTraining();
  const programDelivery = useProgramDelivery(clientId ?? '');
  const journeyClient = useJourneyClient(clientId ?? '');
  const { addSystemMessage } = useMessaging();
  const { addNotification } = useNotifications();

  // ── Local state ────────────────────────────────────────────────────
  const [initialWeeks, setInitialWeeks] = useState<PlanWeek[]>([]);
  const [planInstance, setPlanInstance] = useState<PlanInstance | null>(null);
  const [originalWeekCount, setOriginalWeekCount] = useState(0);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [planName, setPlanName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Template picker
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] =
    useState<PlanTemplate | null>(null);

  // Track current weeks from the shared builder
  const weeksRef = useRef<PlanWeek[]>([]);

  // ── Derived ────────────────────────────────────────────────────────
  const clientName = journeyClient
    ? `${journeyClient.identity.firstName} ${journeyClient.identity.lastName}`.trim()
    : (MOCK_CLIENTS[clientId ?? ''] ?? 'Unknown Client');
  const activeGoal = clientId ? getClientActiveGoal(clientId) : null;

  // ── Initialize from existing plan OR blank ─────────────────────────
  useEffect(() => {
    if (!clientId) return;
    const plan = getClientActivePlan(clientId);
    if (plan) {
      const clonedWeeks = deepCloneWeeks(plan.weeks);
      setInitialWeeks(clonedWeeks);
      weeksRef.current = clonedWeeks;
      setPlanInstance(plan);
      setOriginalWeekCount(plan.weeks.length);
      setIsNewPlan(false);
      setPlanName(plan.name);
    } else {
      const blank = [makeEmptyWeek(1)];
      setInitialWeeks(blank);
      weeksRef.current = blank;
      setPlanInstance(null);
      setOriginalWeekCount(0);
      setIsNewPlan(true);
      setPlanName(`Plan - ${clientName}`);
    }
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load from template ─────────────────────────────────────────────
  const handleLoadTemplate = (template: PlanTemplate) => {
    const clonedWeeks = template.weeks.map((w, wi) => ({
      ...w,
      id: `cpb-t-${Date.now()}-w${wi}`,
      days: w.days.map((d, di) => ({
        ...d,
        id: `cpb-t-${Date.now()}-w${wi}-d${di}`,
        exercises: d.exercises.map((ex, ei) => ({
          ...ex,
          id: `cpb-t-${Date.now()}-w${wi}-d${di}-e${ei}`,
        })),
      })),
    }));
    setInitialWeeks(clonedWeeks);
    weeksRef.current = clonedWeeks;
    setPlanName(`${template.name} - ${clientName}`);
    setShowTemplatePicker(false);
    setPreviewingTemplate(null);
    toast.success(`Loaded template "${template.name}"`);
  };

  // ── Save handler ───────────────────────────────────────────────────
  const handleSaveChanges = () => {
    if (!clientId) return;

    setIsSaving(true);

    const finalWeeks = weeksRef.current.map((w, i) => ({ ...w, order: i + 1 }));

    const messagingClientId =
      clientId === 'client-1'
        ? 'c1'
        : clientId.startsWith('c')
          ? clientId
          : clientId;

    if (isNewPlan) {
      const activeGoalForClient = goals.find(
        (g) => g.clientId === clientId && g.status === 'active',
      );
      const goalId = activeGoalForClient?.id || 'goal-placeholder';
      const newInstance = createPlanInstance(clientId, goalId, planName);

      const updatedInstance: PlanInstance = {
        ...newInstance,
        weeks: finalWeeks,
      };
      updatePlanInstance(updatedInstance);
      setPlanInstance(updatedInstance);
      setIsNewPlan(false);
      programDelivery.deliver();

      addSystemMessage(
        messagingClientId,
        `A new training plan "${planName}" has been created for you by your coach.`,
        'plan-update',
      );

      addNotification({
        title: 'New Plan Created',
        message: `${clientName}'s plan "${planName}" was created successfully.`,
        link: `/coach/clients/${clientId}`,
      });

      toast.success('Plan created & client notified');
    } else {
      if (!planInstance) return;

      const updatedInstance: PlanInstance = {
        ...planInstance,
        weeks: finalWeeks,
        name: planName,
      };

      updatePlanInstance(updatedInstance);

      addSystemMessage(
        messagingClientId,
        `Your training plan "${planInstance.name}" has been updated by your coach.`,
        'plan-update',
      );

      addNotification({
        title: 'Plan Updated',
        message: `${clientName}'s plan "${planInstance.name}" was updated successfully.`,
        link: `/coach/clients/${clientId}`,
      });

      toast.success('Plan changes saved & client notified');
    }

    setIsSaving(false);
    setOriginalWeekCount(finalWeeks.length);
  };

  // ── Insert Deload handler (for sidebar footer) ─────────────────────
  const handleInsertDeload = () => {
    // This creates a deload week and appends it via re-initializing.
    // Since the PlanBuilder manages weeks internally and we track via onWeeksChange,
    // we append to the current weeks and re-initialize.
    const currentWeeks = weeksRef.current;
    const newOrder = currentWeeks.length + 1;
    const deloadWeek = makeEmptyWeek(newOrder, true);
    const updatedWeeks = [...currentWeeks, deloadWeek];
    setInitialWeeks(updatedWeeks);
    weeksRef.current = updatedWeeks;
    toast.success(`Deload week ${newOrder} inserted`);
  };

  // ── Render ─────────────────────────────────────────────────────────

  if (initialWeeks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted animate-pulse" />
          <h2 className="text-xl font-medium text-text-primary mb-2">
            Loading...
          </h2>
          <p className="text-text-secondary mb-6">
            Preparing the plan builder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PlanBuilder
      initialWeeks={initialWeeks}
      originalWeekCount={originalWeekCount}
      onBack={() => navigate('/coach/training')}
      onWeeksChange={(w) => {
        weeksRef.current = w;
      }}
      idPrefix="cpb"
      headerCenter={
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="font-serif text-lg font-medium text-text-primary leading-tight truncate">
              {clientName}
            </h1>
            <p className="text-xs text-text-secondary leading-tight truncate">
              {isNewPlan ? (
                <span className="text-primary font-medium">New Plan</span>
              ) : (
                (planInstance?.name ?? planName)
              )}
            </p>
          </div>

          {isNewPlan && (
            <Badge
              tone="outline"
              className="hidden sm:inline-flex border-primary/20 bg-primary-soft text-primary shrink-0"
            >
              New
            </Badge>
          )}

          {activeGoal && (
            <Badge
              tone="brand-secondary"
              className="hidden sm:inline-flex shrink-0"
            >
              <Target size={12} />
              {activeGoal.type}
            </Badge>
          )}
        </div>
      }
      headerRight={
        <>
          {planTemplates.length > 0 && (
            <Button
              onClick={() => setShowTemplatePicker(true)}
              variant="outline"
              className="hidden sm:flex"
            >
              <FileText size={16} />{' '}
              <span className="hidden lg:inline">Use Template</span>
            </Button>
          )}
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            variant="primary"
            size="md"
            className="shadow-card"
          >
            <Save size={16} />{' '}
            <span className="hidden sm:inline">
              {isSaving
                ? 'Saving...'
                : isNewPlan
                  ? 'Create Plan'
                  : 'Save Changes'}
            </span>
          </Button>
        </>
      }
      sidebarFooterExtra={
        <Button
          onClick={handleInsertDeload}
          variant="outline"
          className="w-full border-brand-secondary/20 bg-brand-secondary-soft text-brand-secondary hover:bg-brand-secondary-surface"
        >
          <Calendar size={16} /> Insert Deload
        </Button>
      }
    >
      {/* ── Template Picker Overlay ──────────────────────────────── */}
      <AnimatePresence>
        {showTemplatePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-6"
            onClick={() => {
              setShowTemplatePicker(false);
              setPreviewingTemplate(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-card shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border rounded-field flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-medium text-text-primary">
                    Use a Template
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Choose a template to load its structure into this plan. This
                    will replace current weeks.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setShowTemplatePicker(false);
                    setPreviewingTemplate(null);
                  }}
                  variant="ghost"
                  size="icon-sm"
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Template List */}
                <div
                  className={`${previewingTemplate ? 'w-1/2 border-r border-border' : 'w-full'} overflow-y-auto p-4 space-y-2 transition-all`}
                >
                  {planTemplates.length === 0 ? (
                    <div className="text-center py-12 text-text-secondary text-sm">
                      No templates yet. Create templates in the Templates tab.
                    </div>
                  ) : (
                    planTemplates.map((template) => {
                      const trainingDays =
                        template.weeks[0]?.days.filter((d) => d.type !== 'Rest')
                          .length || 0;
                      const isSelected = previewingTemplate?.id === template.id;
                      return (
                        <div
                          key={template.id}
                          className={`p-4 rounded-control border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary-soft'
                              : 'border-border hover:border-muted-foreground/30 bg-card'
                          }`}
                          onClick={() => setPreviewingTemplate(template)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-medium text-text-primary">
                                {template.name}
                              </h3>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {template.weeks.length}{' '}
                                {template.weeks.length === 1 ? 'week' : 'weeks'}{' '}
                                · {trainingDays}d/wk
                                {template.weeks.some((w) => w.isDeload) &&
                                  ' · Has deload'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewingTemplate(template);
                                }}
                                variant="ghost"
                                size="icon-sm"
                                className="size-8"
                                title="Preview"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadTemplate(template);
                                }}
                                variant="primary"
                                size="xs"
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Preview Panel */}
                {previewingTemplate && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-1/2 overflow-y-auto p-5 bg-surface-page"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className={WIDGET_TITLE_CLASS}>
                        {previewingTemplate.name}
                      </h3>
                      <Button
                        onClick={() => handleLoadTemplate(previewingTemplate)}
                        variant="primary"
                        size="xs"
                        className="shrink-0"
                      >
                        Use This Template
                      </Button>
                    </div>

                    {previewingTemplate.weeks.map((week, wIdx) => {
                      const trainingDays = week.days.filter(
                        (d) => d.type !== 'Rest',
                      );
                      const totalExercises = week.days.reduce(
                        (sum, d) => sum + d.exercises.length,
                        0,
                      );
                      return (
                        <div key={week.id} className="mb-5">
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className={LABEL_CLASS}>
                              Week {week.order}
                            </span>
                            {week.isDeload && (
                              <Badge tone="brand-secondary">Deload</Badge>
                            )}
                            <span className="text-xs text-text-secondary ml-auto">
                              {trainingDays.length}d · {totalExercises}{' '}
                              exercises
                            </span>
                          </div>
                          <div className="space-y-2">
                            {DAY_NAMES.map((dName, dIdx) => {
                              const day = week.days[dIdx];
                              if (!day || day.type === 'Rest') return null;
                              return (
                                <div
                                  key={dIdx}
                                  className="bg-card rounded-control px-3.5 py-2.5 border border-border"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-text-primary">
                                      {dName}
                                    </span>
                                    <Badge
                                      tone="outline"
                                      className={getDayTypeBadgeClass(day.type)}
                                    >
                                      {day.type}
                                    </Badge>
                                  </div>
                                  {day.exercises.length > 0 && (
                                    <div className="space-y-1.5">
                                      {day.exercises.map((pe, eIdx) => {
                                        const ex = exercises.find(
                                          (e) => e.id === pe.exerciseId,
                                        );
                                        return (
                                          <div
                                            key={eIdx}
                                            className="flex items-center gap-2"
                                          >
                                            <span className="w-4 h-4 rounded-full bg-muted text-xs font-medium text-text-secondary flex items-center justify-center shrink-0">
                                              {eIdx + 1}
                                            </span>
                                            <span className="text-caption font-medium text-text-primary truncate flex-1">
                                              {ex?.name ?? 'Unknown'}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="text-xs font-medium text-text-secondary bg-muted px-1.5 py-0.5 rounded">
                                                {pe.sets}×{pe.reps}
                                              </span>
                                              {pe.rir !== undefined && (
                                                <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                                                  <span className="font-medium">
                                                    RIR
                                                  </span>
                                                  <RirBadge value={pe.rir} />
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {day.exercises.length === 0 && (
                                    <p className="text-xs text-text-secondary italic">
                                      No exercises yet
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PlanBuilder>
  );
}

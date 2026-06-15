import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save, FileText, Target, Calendar, Eye, X,
} from 'lucide-react';
import {
  useTraining, PlanWeek, DayType, PlanInstance, PlanTemplate,
} from '../../context/TrainingContext';
import { useMessaging } from '../../context/MessagingContext';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router';
import { PlanBuilder } from '../../components/coach/PlanBuilder';
import { RirBadge } from '../../components/workout/RirBadge';

// ── Constants ────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe',
  'c2': 'Jessica Alba',
  'c3': 'Emma Stone',
  'c4': 'Sarah Jenkins',
  'c5': 'Mia Thermopolis',
};

function getDayTypeColor(type: DayType) {
  switch (type) {
    case 'Strength': return 'var(--training-strength)';
    case 'Hypertrophy': return 'var(--training-hypertrophy)';
    case 'Recovery': return 'var(--training-recovery)';
    case 'Lighter': return 'var(--training-lighter)';
    default: return 'var(--training-rest)';
  }
}

function getDayTypeSoftColor(type: DayType) {
  switch (type) {
    case 'Strength': return 'var(--training-strength-soft)';
    case 'Hypertrophy': return 'var(--training-hypertrophy-soft)';
    case 'Recovery': return 'var(--training-recovery-soft)';
    case 'Lighter': return 'var(--training-lighter-soft)';
    default: return 'var(--training-rest-soft)';
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
            ssMap.set(e.supersetId, `cpb-ss-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
  const { exercises, planTemplates, getClientActivePlan, updatePlanInstance, createPlanInstance, getClientActiveGoal, goals } = useTraining();
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
  const [previewingTemplate, setPreviewingTemplate] = useState<PlanTemplate | null>(null);

  // Track current weeks from the shared builder
  const weeksRef = useRef<PlanWeek[]>([]);

  // ── Derived ────────────────────────────────────────────────────────
  const clientName = MOCK_CLIENTS[clientId ?? ''] ?? 'Unknown Client';
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
      setPlanName(`Plan - ${MOCK_CLIENTS[clientId] ?? 'Client'}`);
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
      clientId === 'client-1' ? 'c1' : clientId.startsWith('c') ? clientId : clientId;

    if (isNewPlan) {
      const activeGoalForClient = goals.find((g) => g.clientId === clientId && g.status === 'active');
      const goalId = activeGoalForClient?.id || 'goal-placeholder';
      const newInstance = createPlanInstance(clientId, goalId, planName);

      const updatedInstance: PlanInstance = {
        ...newInstance,
        weeks: finalWeeks,
      };
      updatePlanInstance(updatedInstance);
      setPlanInstance(updatedInstance);
      setIsNewPlan(false);

      addSystemMessage(
        messagingClientId,
        `A new training plan "${planName}" has been created for you by your coach.`,
        'plan-update'
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
        'plan-update'
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
      <div className="h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-200 animate-pulse" />
          <h2 className="text-xl font-bold text-foreground mb-2">Loading...</h2>
          <p className="text-muted-foreground mb-6">Preparing the plan builder.</p>
        </div>
      </div>
    );
  }

  return (
    <PlanBuilder
      initialWeeks={initialWeeks}
      originalWeekCount={originalWeekCount}
      onBack={() => navigate('/coach/training')}
      onWeeksChange={(w) => { weeksRef.current = w; }}
      idPrefix="cpb"
      headerCenter={
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg font-serif font-bold text-foreground leading-tight truncate">{clientName}</h1>
            <p className="text-xs text-muted-foreground leading-tight truncate">
              {isNewPlan ? (
                <span className="text-brand font-semibold">New Plan</span>
              ) : (
                planInstance?.name ?? planName
              )}
            </p>
          </div>

          {isNewPlan && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-brand-soft text-brand text-xs font-bold rounded-full border border-brand/20 shrink-0">
              New
            </span>
          )}

          {activeGoal && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-brand-secondary-soft text-brand-secondary text-xs font-bold rounded-full border border-brand-secondary/20 shrink-0">
              <Target size={12} />
              {activeGoal.name}
            </span>
          )}
        </div>
      }
      headerRight={
        <>
          {planTemplates.length > 0 && (
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="hidden sm:flex px-4 py-2 font-semibold text-muted-foreground border border-border hover:bg-muted rounded-xl transition-colors items-center gap-2 text-sm"
            >
              <FileText size={16} /> <span className="hidden lg:inline">Use Template</span>
            </button>
          )}
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-4 lg:px-5 py-2 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover transition-colors shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Save size={16} /> <span className="hidden sm:inline">{isSaving ? 'Saving...' : isNewPlan ? 'Create Plan' : 'Save Changes'}</span>
          </button>
        </>
      }
      sidebarFooterExtra={
        <button
          onClick={handleInsertDeload}
          className="w-full py-2.5 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm rounded-xl transition-colors border border-blue-200"
        >
          <Calendar size={16} /> Insert Deload
        </button>
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
            onClick={() => { setShowTemplatePicker(false); setPreviewingTemplate(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-foreground">Use a Template</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose a template to load its structure into this plan. This will replace current weeks.
                  </p>
                </div>
                <button
                  onClick={() => { setShowTemplatePicker(false); setPreviewingTemplate(null); }}
                  className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Template List */}
                <div className={`${previewingTemplate ? 'w-1/2 border-r border-border' : 'w-full'} overflow-y-auto p-4 space-y-2 transition-all`}>
                  {planTemplates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No templates yet. Create templates in the Templates tab.
                    </div>
                  ) : (
                    planTemplates.map((template) => {
                      const trainingDays = template.weeks[0]?.days.filter((d) => d.type !== 'Rest').length || 0;
                      const isSelected = previewingTemplate?.id === template.id;
                      return (
                        <div
                          key={template.id}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-brand bg-brand/5'
                              : 'border-border hover:border-neutral-300 bg-card'
                          }`}
                          onClick={() => setPreviewingTemplate(template)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-sm text-foreground">{template.name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {template.weeks.length} {template.weeks.length === 1 ? 'week' : 'weeks'} · {trainingDays}d/wk
                                {template.weeks.some((w) => w.isDeload) && ' · Has deload'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setPreviewingTemplate(template); }}
                                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleLoadTemplate(template); }}
                                className="px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
                              >
                                Use
                              </button>
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
                    className="w-1/2 overflow-y-auto p-5 bg-[#FAFAFA]"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold text-base text-foreground">{previewingTemplate.name}</h3>
                      <button
                        onClick={() => handleLoadTemplate(previewingTemplate)}
                        className="px-4 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors shrink-0"
                      >
                        Use This Template
                      </button>
                    </div>

                    {previewingTemplate.weeks.map((week, wIdx) => {
                      const trainingDays = week.days.filter(d => d.type !== 'Rest');
                      const totalExercises = week.days.reduce((sum, d) => sum + d.exercises.length, 0);
                      return (
                        <div key={week.id} className="mb-5">
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Week {week.order}
                            </span>
                            {week.isDeload && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                Deload
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {trainingDays.length}d · {totalExercises} exercises
                            </span>
                          </div>
                          <div className="space-y-2">
                            {DAY_NAMES.map((dName, dIdx) => {
                              const day = week.days[dIdx];
                              if (!day || day.type === 'Rest') return null;
                              return (
                                <div key={dIdx} className="bg-card rounded-xl px-3.5 py-2.5 border border-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-foreground">{dName}</span>
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: getDayTypeSoftColor(day.type),
                                        color: getDayTypeColor(day.type),
                                      }}
                                    >
                                      {day.type}
                                    </span>
                                  </div>
                                  {day.exercises.length > 0 && (
                                    <div className="space-y-1.5">
                                      {day.exercises.map((pe, eIdx) => {
                                        const ex = exercises.find((e) => e.id === pe.exerciseId);
                                        return (
                                          <div key={eIdx} className="flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-muted text-[9px] font-bold text-muted-foreground flex items-center justify-center shrink-0">
                                              {eIdx + 1}
                                            </span>
                                            <span className="text-[11px] font-medium text-foreground truncate flex-1">
                                              {ex?.name ?? 'Unknown'}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {pe.sets}×{pe.reps}
                                              </span>
                                              {pe.rir !== undefined && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                                  <span className="font-medium tracking-wider">RIR</span>
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
                                    <p className="text-[10px] text-muted-foreground italic">No exercises yet</p>
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

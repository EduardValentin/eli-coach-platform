import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Droplet, Plus, X, Trash2 } from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { BrandCalendar } from '../../components/BrandCalendar';
import { ToggleChip } from '../../components/ToggleChip';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ClientWidget } from '../../components/client-portal/ClientWidget';
import { CyclePhaseWidget } from '../../components/CyclePhaseWidget';
import { LABEL_CLASS } from '../../components/typography';
import { cn } from '../../components/ui/utils';
import {
  useCycle,
  CYCLE_SYMPTOMS,
  FlowIntensity,
  CycleSymptom,
  PeriodLogEntry,
} from '../../context/CycleContext';
import { toast } from 'sonner';
import { showUndoToast } from '../../utils/showUndoToast';

const FLOW_OPTIONS: {
  value: FlowIntensity;
  label: string;
  color: string;
  softColor: string;
  onColor: string;
}[] = [
  {
    value: 'light',
    label: 'Light',
    color: 'var(--flow-light)',
    softColor: 'var(--flow-light-soft)',
    onColor: 'var(--flow-light-foreground)',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'var(--flow-medium)',
    softColor: 'var(--flow-medium-soft)',
    onColor: 'var(--flow-medium-foreground)',
  },
  {
    value: 'heavy',
    label: 'Heavy',
    color: 'var(--flow-heavy)',
    softColor: 'var(--flow-heavy-soft)',
    onColor: 'var(--flow-heavy-foreground)',
  },
  {
    value: 'spotting',
    label: 'Spotting',
    color: 'var(--flow-spotting)',
    softColor: 'var(--flow-spotting-soft)',
    onColor: 'var(--flow-spotting-foreground)',
  },
];

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DELETE_THRESHOLD = -80;

function SwipeableLogEntry({
  entry,
  onRemove,
}: {
  entry: PeriodLogEntry & { recordId: string };
  onRemove: (id: string) => void;
}) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -60, 0], [1, 0.8, 0]);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const flowOpt = FLOW_OPTIONS.find((f) => f.value === entry.flow);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      if (
        !isDragging.current &&
        Math.abs(dx) > Math.abs(dy) &&
        Math.abs(dx) > 10
      ) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        x.set(Math.min(0, dx));
      }
    },
    [x],
  );

  const handleTouchEnd = useCallback(() => {
    if (x.get() < DELETE_THRESHOLD) {
      animate(x, -200, { duration: 0.2 });
      setTimeout(() => onRemove(entry.id), 200);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
    isDragging.current = false;
  }, [x, entry.id, onRemove]);

  return (
    <div className="relative overflow-hidden rounded-card">
      {/* Delete background revealed on swipe */}
      <motion.div
        className="absolute inset-y-0 right-0 w-24 bg-destructive flex items-center justify-center rounded-r-card"
        style={{ opacity: deleteOpacity }}
      >
        <Trash2 size={20} className="text-destructive-foreground" />
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        style={{ x }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-center justify-between p-4 min-h-[60px] rounded-card border border-border-subtle bg-card relative z-10 touch-pan-y"
      >
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <div
            className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full shrink-0"
            style={{ backgroundColor: flowOpt?.color ?? 'var(--flow-light)' }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-xs lg:text-sm text-text-primary">
                {new Date(entry.date + 'T00:00:00').toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric', year: 'numeric' },
                )}
              </p>
              <Badge
                className="border-transparent uppercase tracking-label"
                style={{
                  backgroundColor:
                    flowOpt?.softColor ?? 'var(--flow-light-soft)',
                  color: 'var(--text-primary)',
                }}
              >
                {entry.flow}
              </Badge>
            </div>
            {entry.symptoms.length > 0 && (
              <p className="text-caption lg:text-xs text-text-secondary mt-0.5">
                {entry.symptoms
                  .map(
                    (s) =>
                      CYCLE_SYMPTOMS.find((cs) => cs.value === s)?.label ?? s,
                  )
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
        {/* Trash icon: desktop only */}
        <Button
          onClick={() => onRemove(entry.id)}
          variant="ghost"
          size="icon-xs"
          className="text-text-secondary hover:text-destructive shrink-0 ml-3"
          aria-label="Remove log entry"
        >
          <Trash2 size={16} />
        </Button>
      </motion.div>
    </div>
  );
}

export function ClientCycleTracker() {
  const { clientPhase, clientPeriodRecords, logPeriodDay, removePeriodLog } =
    useCycle();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [flow, setFlow] = useState<FlowIntensity>('medium');
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>([]);
  const [notes, setNotes] = useState('');
  const [symptomsExpanded, setSymptomsExpanded] = useState(false);
  const VISIBLE_SYMPTOMS_COUNT = 8;

  const periodDates = useMemo(() => {
    const dates = new Set<string>();
    for (const record of clientPeriodRecords) {
      for (const entry of record.entries) {
        dates.add(entry.date);
      }
    }
    return dates;
  }, [clientPeriodRecords]);

  const existingEntry: PeriodLogEntry | undefined = useMemo(() => {
    if (!selectedDate) return undefined;
    const iso = toISO(selectedDate);
    for (const record of clientPeriodRecords) {
      const found = record.entries.find((e) => e.date === iso);
      if (found) return found;
    }
    return undefined;
  }, [selectedDate, clientPeriodRecords]);

  const recentEntries = useMemo(() => {
    const all: (PeriodLogEntry & { recordId: string })[] = [];
    for (const record of clientPeriodRecords) {
      for (const entry of record.entries) {
        all.push({ ...entry, recordId: record.id });
      }
    }
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  }, [clientPeriodRecords]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const iso = toISO(date);
      const existing = clientPeriodRecords
        .flatMap((r) => r.entries)
        .find((e) => e.date === iso);
      if (existing) {
        setFlow(existing.flow);
        setSymptoms([...existing.symptoms]);
        setNotes(existing.notes ?? '');
      } else {
        setFlow('medium');
        setSymptoms([]);
        setNotes('');
      }
    }
  };

  const toggleSymptom = (s: CycleSymptom) => {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleLog = () => {
    if (!selectedDate) return;
    logPeriodDay(
      'client-1',
      toISO(selectedDate),
      flow,
      symptoms,
      notes || undefined,
    );
    toast.success(
      `Period logged for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    );
    setSelectedDate(undefined);
    setSymptoms([]);
    setNotes('');
  };

  const handleRemove = (entryId: string) => {
    const entry = clientPeriodRecords
      .flatMap((r) => r.entries)
      .find((e) => e.id === entryId);
    if (!entry) return;
    removePeriodLog(entryId);
    showUndoToast({
      message: 'Log entry removed',
      onUndo: () =>
        logPeriodDay(
          'client-1',
          entry.date,
          entry.flow,
          entry.symptoms,
          entry.notes,
        ),
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <PortalPageHeader
        title="Cycle Tracker"
        subtitle="Log your periods and track your cycle phases."
      />

      {/* Phase Summary */}
      {clientPhase && (
        <CyclePhaseWidget
          presentation="client"
          phase={clientPhase}
          headingId="phase-summary-heading"
          className="mb-8"
        >
          <p className="text-sm text-text-secondary mt-2 font-medium">
            {clientPhase.phase === 'menstrual' &&
              'Focus on iron-rich foods and gentle movement.'}
            {clientPhase.phase === 'follicular' &&
              'Energy is rising. Great time to increase intensity.'}
            {clientPhase.phase === 'ovulatory' &&
              'Peak energy. Push your training and eat lighter.'}
            {clientPhase.phase === 'luteal' &&
              'Prioritize complex carbs and recovery. Listen to your body.'}
          </p>
        </CyclePhaseWidget>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Calendar */}
        <ClientWidget eyebrow="Your calendar" headingId="calendar-heading">
          <BrandCalendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={{ after: new Date() }}
            modifiers={{
              period: (date) => periodDates.has(toISO(date)),
            }}
            modifiersClassNames={{
              period: 'bg-cycle-menstrual-soft text-primary font-medium',
            }}
          />

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border-subtle text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cycle-menstrual/20 border border-cycle-menstrual/30" />
              <span>Period day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full ring-2 ring-primary/30" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Selected</span>
            </div>
          </div>
        </ClientWidget>

        {/* Log Panel */}
        <ClientWidget
          eyebrow="Log period"
          headingId="log-period-heading"
          hero={
            selectedDate
              ? selectedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : undefined
          }
          className="self-start"
          action={
            selectedDate && (
              <Button
                aria-label="Clear selected date"
                onClick={() => setSelectedDate(undefined)}
                variant="ghost"
                size="icon-xs"
              >
                <X size={18} />
              </Button>
            )
          }
        >
          {selectedDate ? (
            <div className="mt-4">
              {/* Flow intensity */}
              <div className="mb-6">
                <Label className={cn(LABEL_CLASS, 'mb-3 block')}>
                  Flow Intensity
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {FLOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFlow(opt.value)}
                      className={`px-3 py-2.5 rounded-control text-sm font-medium transition-all ${
                        flow === opt.value
                          ? 'shadow-card'
                          : 'bg-surface-quiet text-text-secondary hover:bg-surface-muted border border-border-subtle'
                      }`}
                      style={
                        flow === opt.value
                          ? { backgroundColor: opt.color, color: opt.onColor }
                          : undefined
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div className="mb-6">
                <Label className={cn(LABEL_CLASS, 'mb-3 block')}>
                  Symptoms
                </Label>
                <div className="flex flex-wrap gap-2">
                  {(symptomsExpanded
                    ? CYCLE_SYMPTOMS
                    : CYCLE_SYMPTOMS.slice(0, VISIBLE_SYMPTOMS_COUNT)
                  ).map((s) => (
                    <ToggleChip
                      key={s.value}
                      pressed={symptoms.includes(s.value)}
                      onPressedChange={() => toggleSymptom(s.value)}
                    >
                      {s.label}
                    </ToggleChip>
                  ))}
                  {CYCLE_SYMPTOMS.length > VISIBLE_SYMPTOMS_COUNT && (
                    <Button
                      type="button"
                      onClick={() =>
                        setSymptomsExpanded((expanded) => !expanded)
                      }
                      aria-expanded={symptomsExpanded}
                      variant="outline"
                    >
                      {symptomsExpanded
                        ? 'Show less'
                        : `+${CYCLE_SYMPTOMS.length - VISIBLE_SYMPTOMS_COUNT} more`}
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <Label
                  htmlFor="cycle-log-notes"
                  className={cn(LABEL_CLASS, 'mb-2 block')}
                >
                  Notes
                </Label>
                <Textarea
                  id="cycle-log-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How are you feeling today?"
                  className="rounded-control min-h-[80px]"
                />
              </div>

              <Button
                onClick={handleLog}
                variant="primary"
                size="md"
                className="w-full"
              >
                <Plus size={16} />
                {existingEntry ? 'Update Log' : 'Log Period'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-cycle-menstrual/10 text-cycle-menstrual flex items-center justify-center mx-auto mb-4">
                <Droplet size={28} />
              </div>
              <p className="text-sm text-text-secondary max-w-xs mx-auto">
                Select a date on the calendar to log your flow, symptoms, and
                notes.
              </p>
            </div>
          )}
        </ClientWidget>
      </div>

      {/* Recent Logs */}
      {recentEntries.length > 0 && (
        <ClientWidget
          eyebrow="Recent logs"
          headingId="recent-logs-heading"
          className="mt-8"
        >
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <SwipeableLogEntry
                key={entry.id}
                entry={entry}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </ClientWidget>
      )}
    </div>
  );
}

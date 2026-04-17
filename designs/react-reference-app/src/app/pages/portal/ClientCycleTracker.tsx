import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Droplet, Plus, X, Trash2 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import {
  useCycle,
  CYCLE_SYMPTOMS,
  FlowIntensity,
  CycleSymptom,
  PeriodLogEntry,
} from '../../context/CycleContext';
import { toast } from 'sonner';

const FLOW_OPTIONS: { value: FlowIntensity; label: string; color: string }[] = [
  { value: 'light',    label: 'Light',    color: '#FF4D6D' },
  { value: 'medium',   label: 'Medium',   color: '#E8365D' },
  { value: 'heavy',    label: 'Heavy',    color: '#C81D6B' },
  { value: 'spotting', label: 'Spotting', color: '#FFB4C6' },
];

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DELETE_THRESHOLD = -80;

function SwipeableLogEntry({ entry, onRemove }: { entry: PeriodLogEntry & { recordId: string }; onRemove: (id: string) => void }) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -60, 0], [1, 0.8, 0]);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const flowOpt = FLOW_OPTIONS.find(f => f.value === entry.flow);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (!isDragging.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isDragging.current = true;
    }
    if (isDragging.current) {
      x.set(Math.min(0, dx));
    }
  }, [x]);

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
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete background revealed on swipe */}
      <motion.div
        className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center rounded-r-2xl"
        style={{ opacity: deleteOpacity }}
      >
        <Trash2 size={20} className="text-white" />
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        style={{ x }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-center justify-between p-4 min-h-[60px] rounded-2xl border border-neutral-100 bg-neutral-50/50 relative z-10 bg-white touch-pan-y"
      >
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <div
            className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full shrink-0"
            style={{ backgroundColor: flowOpt?.color ?? '#FF4D6D' }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-xs lg:text-sm text-[#121212]">
                {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <span
                className="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${flowOpt?.color ?? '#FF4D6D'}15`, color: flowOpt?.color ?? '#FF4D6D' }}
              >
                {entry.flow}
              </span>
            </div>
            {entry.symptoms.length > 0 && (
              <p className="text-[11px] lg:text-xs text-neutral-500 mt-0.5">
                {entry.symptoms.map(s => CYCLE_SYMPTOMS.find(cs => cs.value === s)?.label ?? s).join(', ')}
              </p>
            )}
          </div>
        </div>
        {/* Trash icon: desktop only */}
        <button
          onClick={() => onRemove(entry.id)}
          className="text-neutral-300 hover:text-red-500 transition-colors shrink-0 ml-3"
          aria-label="Remove log entry"
        >
          <Trash2 size={16} />
        </button>
      </motion.div>
    </div>
  );
}

export function ClientCycleTracker() {
  const { clientPhase, clientPeriodRecords, logPeriodDay, removePeriodLog } = useCycle();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [flow, setFlow] = useState<FlowIntensity>('medium');
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>([]);
  const [notes, setNotes] = useState('');

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
      const found = record.entries.find(e => e.date === iso);
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
        .flatMap(r => r.entries)
        .find(e => e.date === iso);
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
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleLog = () => {
    if (!selectedDate) return;
    logPeriodDay('client-1', toISO(selectedDate), flow, symptoms, notes || undefined);
    toast.success(`Period logged for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    setSelectedDate(undefined);
    setSymptoms([]);
    setNotes('');
  };

  const handleRemove = (entryId: string) => {
    removePeriodLog(entryId);
    toast.success('Log entry removed');
  };

  const PhaseIcon = Droplet;

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <header className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-3 tracking-tight">
          Cycle Tracker
        </h1>
        <p className="text-neutral-500 font-medium">
          Log your periods and track your cycle phases.
        </p>
      </header>

      {/* Phase Summary */}
      {clientPhase && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 mb-8 flex items-center gap-5"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${clientPhase.phaseColor}15`, color: clientPhase.phaseColor }}
          >
            <PhaseIcon size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-lg lg:text-xl font-semibold" style={{ color: clientPhase.phaseColor }}>
                {clientPhase.phaseName} Phase
              </h2>
              <span className="text-xs font-bold text-neutral-400 tracking-widest uppercase">
                Day {clientPhase.dayInCycle}
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1 font-medium">
              {clientPhase.phase === 'menstrual' && 'Focus on iron-rich foods and gentle movement.'}
              {clientPhase.phase === 'follicular' && 'Energy is rising. Great time to increase intensity.'}
              {clientPhase.phase === 'ovulatory' && 'Peak energy. Push your training and eat lighter.'}
              {clientPhase.phase === 'luteal' && 'Prioritize complex carbs and recovery. Listen to your body.'}
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <h2 className="font-serif text-lg lg:text-xl text-[#121212] font-semibold mb-6">Your Calendar</h2>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            showOutsideDays
            disabled={{ after: new Date() }}
            className="w-full"
            classNames={{
              months: 'flex flex-col w-full',
              month: 'flex flex-col gap-4 w-full',
              caption: 'flex justify-center pt-1 relative items-center w-full',
              caption_label: 'text-sm font-semibold text-[#121212]',
              nav: 'flex items-center gap-1',
              nav_button: 'size-8 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse',
              head_row: 'flex w-full',
              head_cell: 'text-neutral-400 rounded-md flex-1 h-10 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center',
              row: 'flex w-full mt-1',
              cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 [&:has([aria-selected])]:rounded-xl',
              day: 'w-full aspect-square p-0 font-medium rounded-xl hover:bg-neutral-100 transition-colors aria-selected:opacity-100 inline-flex items-center justify-center relative',
              day_selected: 'bg-[#C81D6B] text-white hover:bg-[#a31556] focus:bg-[#C81D6B] focus:text-white',
              day_today: 'ring-2 ring-[#C81D6B]/30',
              day_outside: 'text-neutral-300 hover:bg-neutral-50',
              day_disabled: 'text-neutral-300 opacity-50 hover:bg-transparent',
            }}
            modifiers={{
              period: (date) => periodDates.has(toISO(date)),
            }}
            modifiersClassNames={{
              period: 'bg-[#FF4D6D]/10 text-[#C81D6B] font-semibold hover:bg-[#FF4D6D]/20',
            }}
          />

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF4D6D]/20 border border-[#FF4D6D]/30" />
              <span>Period day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full ring-2 ring-[#C81D6B]/30" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#C81D6B]" />
              <span>Selected</span>
            </div>
          </div>
        </motion.div>

        {/* Log Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 self-start"
        >
          {selectedDate ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-lg lg:text-xl text-[#121212] font-semibold">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h2>
                <button
                  onClick={() => setSelectedDate(undefined)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Flow intensity */}
              <div className="mb-6">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 block">
                  Flow Intensity
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FLOW_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFlow(opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        flow === opt.value
                          ? 'text-white shadow-md'
                          : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-100'
                      }`}
                      style={flow === opt.value ? { backgroundColor: opt.color } : undefined}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div className="mb-6">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 block">
                  Symptoms
                </label>
                <div className="flex flex-wrap gap-2">
                  {CYCLE_SYMPTOMS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => toggleSymptom(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        symptoms.includes(s.value)
                          ? 'bg-[#C81D6B]/10 text-[#C81D6B] ring-1 ring-[#C81D6B]/20'
                          : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="How are you feeling today?"
                  className="w-full border border-neutral-200 rounded-xl p-3 min-h-[80px] focus:outline-none focus:border-[#C81D6B] transition-colors text-sm resize-none"
                />
              </div>

              <button
                onClick={handleLog}
                className="w-full py-3 bg-[#C81D6B] text-white text-sm font-semibold rounded-xl hover:bg-[#a31556] transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {existingEntry ? 'Update Log' : 'Log Period'}
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#FF4D6D]/10 text-[#FF4D6D] flex items-center justify-center mx-auto mb-4">
                <Droplet size={28} />
              </div>
              <h3 className="font-serif text-lg text-[#121212] mb-2">Log a Period Day</h3>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                Select a date on the calendar to log your flow, symptoms, and notes.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Logs */}
      {recentEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <h2 className="font-serif text-lg lg:text-xl text-[#121212] font-semibold mb-4 lg:mb-6">Recent Logs</h2>
          <div className="space-y-3">
            {recentEntries.map(entry => (
              <SwipeableLogEntry key={entry.id} entry={entry} onRemove={handleRemove} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

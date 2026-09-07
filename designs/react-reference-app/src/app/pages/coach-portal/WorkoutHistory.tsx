import { useMemo, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Dumbbell, Clock, TrendingUp, Activity, SlidersHorizontal } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useTraining, subscriptionTermLabel } from '../../context/TrainingContext';
import type { Subscription, WorkoutLog } from '../../context/TrainingContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatVolume, displayWeightValue, fromDisplayWeight, weightUnitLabel } from '../../utils/units';
import { MetricTile } from '../../components/MetricTile';
import { SubscriptionBadge } from '../../components/coach-portal/SubscriptionBadge';
import { WorkoutSessionCard } from '../../components/workout/WorkoutSessionCard';
import { BrandCalendar } from '../../components/BrandCalendar';
import { Slider } from '../../components/ui/slider';
import { Input } from '../../components/ui/input';
import { ToggleChip } from '../../components/ToggleChip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe', 'c1': 'Jane Doe', 'c2': 'Jessica Alba', 'c3': 'Emma Stone', 'c4': 'Sarah Jenkins', 'c5': 'Mia Thermopolis'
};

function SubscriptionScopeLabel({ subscription }: { subscription: Subscription }) {
  const active = subscription.status === 'active';
  return (
    <span className="inline-flex items-center gap-1.5">
      {subscriptionTermLabel(subscription)}
      <span aria-hidden="true" className="text-muted-foreground">·</span>
      <span className={`text-xs font-bold uppercase tracking-wide ${active ? 'text-success' : 'text-muted-foreground'}`}>
        {active ? 'Active' : 'Expired'}
      </span>
    </span>
  );
}

interface SessionGroup {
  key: string;
  subscription?: Subscription;
  planName: string;
  planStartDate: string;
  weekIndex: number;
  logs: WorkoutLog[];
  volume: number;
}

export function WorkoutHistory() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { getClientWorkoutHistory, exercises, planInstances, subscriptions } = useTraining();
  const { weightUnit } = useUnitPreferences();

  const dataClientId = clientId === 'c1' ? 'client-1' : clientId || 'client-1';
  const clientName = MOCK_CLIENTS[clientId || ''] || 'Unknown Client';
  const history = getClientWorkoutHistory(dataClientId);

  const planById = useMemo(() => new Map(planInstances.map(p => [p.id, p])), [planInstances]);
  const subById = useMemo(() => new Map(subscriptions.map(s => [s.id, s])), [subscriptions]);

  // ── Navigation scope: subscription → training plan ──────────────
  const clientSubs = useMemo(
    () => subscriptions
      .filter(s => s.clientId === dataClientId)
      .sort((a, b) => {
        const aActive = a.status === 'active' ? 0 : 1;
        const bActive = b.status === 'active' ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return (b.startDate || '').localeCompare(a.startDate || '');
      }),
    [subscriptions, dataClientId],
  );
  const clientPlans = useMemo(() => planInstances.filter(p => p.clientId === dataClientId), [planInstances, dataClientId]);

  const [subscriptionScope, setSubscriptionScope] = useState('all');
  const [planScope, setPlanScope] = useState('all');

  const plansInScope = useMemo(
    () => (subscriptionScope === 'all' ? clientPlans : clientPlans.filter(p => p.subscriptionId === subscriptionScope))
      .slice()
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')),
    [clientPlans, subscriptionScope],
  );
  const selectedSub = subscriptionScope === 'all' ? undefined : subById.get(subscriptionScope);

  // ── Filter bounds (from the full history) ───────────────────────
  const durationsAll = history.map(w => Math.round((w.duration || 0) / 60));
  const volumesAllKg = history.map(w => w.totalVolume || 0);
  const durMin = durationsAll.length ? Math.min(...durationsAll) : 0;
  const durMax = durationsAll.length ? Math.max(...durationsAll) : 0;
  const volMinKg = volumesAllKg.length ? Math.min(...volumesAllKg) : 0;
  const volMaxKg = volumesAllKg.length ? Math.max(...volumesAllKg) : 0;

  // ── Filter state ────────────────────────────────────────────────
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [durationRange, setDurationRange] = useState<[number, number]>([durMin, durMax]);
  const [volumeRangeKg, setVolumeRangeKg] = useState<[number, number]>([volMinKg, volMaxKg]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  const muscleOptions = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(e => e.primaryMuscles.forEach(m => set.add(m)));
    return Array.from(set).sort();
  }, [exercises]);

  const dateTouched = Boolean(dateRange?.from || dateRange?.to);
  const durationTouched = durationRange[0] > durMin || durationRange[1] < durMax;
  const volumeTouched = volumeRangeKg[0] > volMinKg || volumeRangeKg[1] < volMaxKg;
  const activeFilterCount =
    (dateTouched ? 1 : 0) +
    (durationTouched ? 1 : 0) +
    (volumeTouched ? 1 : 0) +
    (selectedMuscles.length ? 1 : 0);

  const clearAll = () => {
    setDateRange(undefined);
    setDurationRange([durMin, durMax]);
    setVolumeRangeKg([volMinKg, volMaxKg]);
    setSelectedMuscles([]);
  };

  // ── Current selection (scope + filters applied) ─────────────────
  const filtered = useMemo(() => history.filter(w => {
    if (subscriptionScope !== 'all' && planById.get(w.planInstanceId)?.subscriptionId !== subscriptionScope) return false;
    if (planScope !== 'all' && w.planInstanceId !== planScope) return false;
    const d = new Date(w.startedAt);
    if (dateRange?.from && d < dateRange.from) return false;
    if (dateRange?.to) {
      const end = new Date(dateRange.to);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    const min = Math.round((w.duration || 0) / 60);
    if (min < durationRange[0] || min > durationRange[1]) return false;
    const vol = w.totalVolume || 0;
    if (vol < volumeRangeKg[0] || vol > volumeRangeKg[1]) return false;
    if (selectedMuscles.length) {
      const ms = new Set<string>();
      w.exercises.forEach(el => exercises.find(e => e.id === el.exerciseId)?.primaryMuscles.forEach(m => ms.add(m)));
      if (!selectedMuscles.some(m => ms.has(m))) return false;
    }
    return true;
  }), [history, subscriptionScope, planScope, dateRange, durationRange, volumeRangeKg, selectedMuscles, exercises, planById]);

  // ── Per-session metrics over the current selection ──────────────
  const count = filtered.length;
  const totalVolume = filtered.reduce((t, w) => t + (w.totalVolume || 0), 0);
  const totalDuration = filtered.reduce((t, w) => t + (w.duration || 0), 0);
  const avgVolume = count ? Math.round(totalVolume / count) : 0;
  const avgDuration = count ? Math.round(totalDuration / 60 / count) : 0;

  const topExercises = useMemo(() => {
    const freq: Record<string, number> = {};
    filtered.forEach(w => w.exercises.forEach(el => { freq[el.exerciseId] = (freq[el.exerciseId] || 0) + 1; }));
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, c]) => ({ exercise: exercises.find(e => e.id === id), count: c }))
      .filter(e => e.exercise);
  }, [filtered, exercises]);

  // ── Default grouping: subscription → training plan → week ───────
  const groups = useMemo<SessionGroup[]>(() => {
    const map = new Map<string, SessionGroup>();
    filtered.forEach(w => {
      const plan = planById.get(w.planInstanceId);
      const sub = plan?.subscriptionId ? subById.get(plan.subscriptionId) : undefined;
      const key = `${sub?.id ?? 'none'}__${w.planInstanceId}__${w.weekIndex}`;
      let g = map.get(key);
      if (!g) {
        g = { key, subscription: sub, planName: plan?.name ?? 'Unknown plan', planStartDate: plan?.startDate ?? '', weekIndex: w.weekIndex, logs: [], volume: 0 };
        map.set(key, g);
      }
      g.logs.push(w);
      g.volume += w.totalVolume || 0;
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const aActive = a.subscription?.status === 'active' ? 0 : 1;
      const bActive = b.subscription?.status === 'active' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      const aStart = a.subscription?.startDate ?? '';
      const bStart = b.subscription?.startDate ?? '';
      if (aStart !== bStart) return bStart.localeCompare(aStart);
      if (a.planStartDate !== b.planStartDate) return b.planStartDate.localeCompare(a.planStartDate);
      return a.weekIndex - b.weekIndex;
    });
    arr.forEach(g => g.logs.sort((x, y) => new Date(x.startedAt).getTime() - new Date(y.startedAt).getTime()));
    return arr;
  }, [filtered, planById, subById]);

  // ── Volume slider works in the coach's display unit ─────────────
  const volDisplayMin = Math.floor(displayWeightValue(volMinKg, weightUnit, 0));
  const volDisplayMax = Math.ceil(displayWeightValue(volMaxKg, weightUnit, 0));
  const volDisplayValue: [number, number] = [
    Math.round(displayWeightValue(volumeRangeKg[0], weightUnit, 0)),
    Math.round(displayWeightValue(volumeRangeKg[1], weightUnit, 0)),
  ];
  const volStep = Math.max(1, Math.round((volDisplayMax - volDisplayMin) / 100));

  const dateRangeLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
    : dateRange?.from
      ? `${format(dateRange.from, 'MMM d, yyyy')} – …`
      : 'Any dates';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/coach/clients/${clientId}`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
          aria-label="Back to client"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Workout History</h1>
          <p className="text-sm text-muted-foreground">{clientName}</p>
        </div>
      </div>

      {/* Selection-scoped metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricTile tone="neutral" icon={<Calendar size={16} />} label="Sessions" value={count} />
        <MetricTile tone="brand" icon={<Dumbbell size={16} />} label="Total Volume" value={formatVolume(totalVolume, weightUnit)} />
        <MetricTile tone="brand-secondary" icon={<TrendingUp size={16} />} label="Avg Volume" suffix="/ session" value={formatVolume(avgVolume, weightUnit)} />
        <MetricTile tone="neutral" icon={<Clock size={16} />} label="Avg Duration" suffix="/ session" value={`${avgDuration} min`} />
      </div>

      {history.length > 0 && (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6">
          {/* Scope selectors + filter toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:flex lg:items-center flex-1 min-w-0">
              <Select
                value={subscriptionScope}
                onValueChange={(v) => { setSubscriptionScope(v); setPlanScope('all'); }}
              >
                <SelectTrigger className="lg:w-56" aria-label="Filter by subscription">
                  {selectedSub ? <SubscriptionScopeLabel subscription={selectedSub} /> : 'All subscriptions'}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subscriptions</SelectItem>
                  {clientSubs.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <SubscriptionScopeLabel subscription={s} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={planScope} onValueChange={setPlanScope}>
                <SelectTrigger className="lg:w-64" aria-label="Filter by training plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All training plans</SelectItem>
                  {plansInScope.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-muted-foreground">· {format(parseISO(p.startDate), 'MMM d, yyyy')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 lg:ml-auto">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-brand text-brand-foreground text-xs font-bold size-5 tabular-nums">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </CollapsibleTrigger>
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearAll} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Clear all
                </button>
              )}
            </div>
          </div>

          <CollapsibleContent>
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <FilterField icon={<Calendar size={14} />} label="Date range">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-input-background px-3.5 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <span className={dateTouched ? 'text-foreground' : 'text-muted-foreground'}>{dateRangeLabel}</span>
                        <Calendar size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-3">
                      <div className="w-[18rem]">
                        <BrandCalendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={1} />
                      </div>
                      {dateTouched && (
                        <button
                          type="button"
                          onClick={() => setDateRange(undefined)}
                          className="mt-2 w-full rounded-lg py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          Clear dates
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
                </FilterField>

                <FilterField icon={<Clock size={14} />} label="Duration">
                  <RangeControl
                    min={durMin}
                    max={durMax}
                    value={durationRange}
                    onValueChange={setDurationRange}
                    unit="min"
                    ariaLabel="Duration"
                  />
                </FilterField>

                <FilterField icon={<Dumbbell size={14} />} label="Volume">
                  <RangeControl
                    min={volDisplayMin}
                    max={volDisplayMax}
                    step={volStep}
                    value={volDisplayValue}
                    onValueChange={v => setVolumeRangeKg([fromDisplayWeight(v[0], weightUnit), fromDisplayWeight(v[1], weightUnit)])}
                    unit={weightUnitLabel(weightUnit)}
                    ariaLabel="Volume"
                  />
                </FilterField>
              </div>

              <FilterField icon={<Activity size={14} />} label="Muscle groups trained">
                <div className="flex flex-wrap gap-2">
                  {muscleOptions.map(m => (
                    <ToggleChip
                      key={m}
                      pressed={selectedMuscles.includes(m)}
                      onPressedChange={on => setSelectedMuscles(prev => on ? [...prev, m] : prev.filter(x => x !== m))}
                    >
                      {m}
                    </ToggleChip>
                  ))}
                </div>
              </FilterField>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {history.length === 0 ? (
        <div className="text-center py-16">
          <Activity size={32} className="text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
          <p className="text-muted-foreground">No completed workouts yet</p>
        </div>
      ) : (
        <>
          {topExercises.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Most Trained</h2>
              <div className="flex flex-wrap gap-2">
                {topExercises.map(({ exercise, count }) => (
                  <span key={exercise!.id} className="text-xs bg-muted border border-border text-foreground rounded-full px-3 py-1.5 font-medium">
                    {exercise!.name} <span className="text-muted-foreground ml-1">{count}x</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">All Sessions</h2>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Activity size={32} className="text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
              <p className="text-muted-foreground mb-4">No sessions match your selection</p>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map(g => (
                <section key={g.key}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 border-b border-border rounded-md pb-2 mb-3">
                    <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-foreground">
                      {g.subscription && <SubscriptionBadge subscription={g.subscription} />}
                      <span aria-hidden="true" className="text-muted-foreground">·</span>
                      <span>{g.planName}</span>
                      <span aria-hidden="true" className="text-muted-foreground">·</span>
                      <span className="font-medium text-muted-foreground">Week {g.weekIndex + 1}</span>
                    </h3>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {g.logs.length} {g.logs.length === 1 ? 'session' : 'sessions'} · {formatVolume(g.volume, weightUnit)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {g.logs.map(log => (
                      <WorkoutSessionCard key={log.id} log={log} to={`/coach/clients/${clientId}/workout/${log.id}`} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterField({ icon, label, value, children }: { icon: ReactNode; label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <span className="text-brand-secondary" aria-hidden="true">{icon}</span>
          {label}
        </span>
        {value != null && <span className="text-xs font-semibold text-foreground tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function RangeControl({ min, max, step = 1, value, onValueChange, unit, ariaLabel }: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (v: [number, number]) => void;
  unit?: string;
  ariaLabel: string;
}) {
  const setMin = (raw: string) => {
    if (raw === '') return onValueChange([min, value[1]]);
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    onValueChange([Math.max(min, Math.min(n, value[1])), value[1]]);
  };
  const setMax = (raw: string) => {
    if (raw === '') return onValueChange([value[0], max]);
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    onValueChange([value[0], Math.min(max, Math.max(n, value[0]))]);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={min}
          max={value[1]}
          step={step}
          value={value[0]}
          onChange={e => setMin(e.target.value)}
          aria-label={`${ariaLabel} minimum`}
          className="h-9 w-24 tabular-nums"
        />
        <span className="text-muted-foreground" aria-hidden="true">–</span>
        <Input
          type="number"
          inputMode="numeric"
          min={value[0]}
          max={max}
          step={step}
          value={value[1]}
          onChange={e => setMax(e.target.value)}
          aria-label={`${ariaLabel} maximum`}
          className="h-9 w-24 tabular-nums"
        />
        {unit && <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{unit}</span>}
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={v => onValueChange([v[0], v[1]])}
        aria-label={ariaLabel}
      />
    </div>
  );
}

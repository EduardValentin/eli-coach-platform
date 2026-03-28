import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, Trash2, GripVertical, CheckSquare, Search, Activity,
  Info, ArrowLeft, Filter, MoreVertical, Copy, ArrowLeftRight,
  MessageSquare, Layers, PanelLeftOpen, Library
} from 'lucide-react';
import { useTraining, PlanWeek, PlanDay, PlanExercise, DayType, Exercise } from '../../context/TrainingContext';
import { toast } from 'sonner';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';

// ── Constants ────────────────────────────────────────────────────────

const DAY_TYPES: DayType[] = ['Rest', 'Recovery', 'Strength', 'Hypertrophy', 'Lighter'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDayTypeColor(type: DayType) {
  switch (type) {
    case 'Strength': return '#121212';
    case 'Hypertrophy': return '#00796B';
    case 'Recovery': return '#16a34a';
    case 'Lighter': return '#2563eb';
    default: return '#d4d4d4';
  }
}

// ── DnD Subcomponents ────────────────────────────────────────────────

function DropSeparator({ index, onDrop, isTrailing }: { index: number; onDrop: (item: any, idx: number) => void; isTrailing?: boolean }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['LIBRARY_EXERCISE', 'PLAN_EXERCISE'],
    drop: (item) => onDrop(item, index),
    collect: (monitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
  }), [onDrop, index]);

  return (
    <div
      ref={drop as any}
      className={`z-10 relative group/drop cursor-default ${
        isTrailing
          ? 'min-h-[200px] flex-1 flex items-start pt-4'
          : canDrop ? 'py-4 -my-2' : 'py-3'
      }`}
    >
      <div
        className={`h-0.5 transition-all duration-200 rounded-full mx-4 ${isTrailing ? 'w-full' : ''} ${
          isOver
            ? 'h-2 bg-[#C81D6B] shadow-[0_0_8px_rgba(200,29,107,0.5)]'
            : 'bg-transparent group-hover/drop:bg-neutral-200'
        }`}
      />
    </div>
  );
}

/** Large drop target shown when a day has no exercises yet */
function EmptyDropTarget({ onDrop }: { onDrop: (item: any) => void }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['LIBRARY_EXERCISE', 'PLAN_EXERCISE'],
    drop: (item) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [onDrop]);

  return (
    <div
      ref={drop as any}
      className={`py-16 text-center border-2 border-dashed rounded-2xl mt-4 flex flex-col items-center transition-all duration-200 ${
        isOver && canDrop
          ? 'border-[#C81D6B] bg-[#C81D6B]/5 text-[#C81D6B]'
          : canDrop
            ? 'border-[#C81D6B]/30 bg-[#C81D6B]/[0.02] text-neutral-400'
            : 'border-neutral-300 bg-neutral-50/50 text-neutral-400'
      }`}
    >
      <Plus size={32} className={`mb-4 ${isOver && canDrop ? 'text-[#C81D6B]' : 'text-neutral-300'}`} />
      <p className={`font-medium ${isOver && canDrop ? 'text-[#C81D6B]' : 'text-neutral-500'}`}>
        {isOver && canDrop ? 'Drop to add exercise' : 'Drag exercises here'}
      </p>
      <p className="text-sm mt-1">
        Pull items from the library on the right, or click the + icon to quick-add.
      </p>
    </div>
  );
}

/** A full-area drop zone that acts as a "catch-all" — appends exercise to end of list */
function FullAreaDropZone({ onDrop, children }: { onDrop: (item: any) => void; children: React.ReactNode }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['LIBRARY_EXERCISE'],
    drop: (item, monitor) => {
      // Only handle if not already handled by a more specific target (DropSeparator or PlanGroupCard)
      if (monitor.didDrop()) return;
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true }),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop as any}
      className={`flex-1 transition-colors duration-200 ${
        isOver && canDrop ? 'bg-[#C81D6B]/[0.03]' : ''
      }`}
    >
      {children}
    </div>
  );
}

function LibraryExerciseCard({ ex, onQuickAdd }: { ex: Exercise; onQuickAdd: (ex: Exercise) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'LIBRARY_EXERCISE',
    item: { type: 'LIBRARY_EXERCISE', exercise: ex },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [ex]);

  const [flashed, setFlashed] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(ex);
    setFlashed(true);
    setTimeout(() => setFlashed(false), 600);
  };

  return (
    <div
      ref={drag as any}
      className={`p-3 bg-white border rounded-xl hover:shadow-md transition-all group flex flex-col cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-50 ring-2 ring-[#C81D6B]'
          : flashed
          ? 'ring-2 ring-[#C81D6B]/50 border-[#C81D6B]/30'
          : 'border-neutral-100'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-semibold text-[#121212] leading-tight">{ex.name}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={handleQuickAdd}
            className="p-1 rounded-md text-neutral-400 hover:text-[#C81D6B] hover:bg-[#C81D6B]/10 opacity-0 group-hover:opacity-100 transition-all"
            title="Add to current day"
          >
            <Plus size={14} />
          </button>
          <div className="text-neutral-400 group-hover:text-[#C81D6B] transition-colors">
            <GripVertical size={16} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-auto">
        {ex.tags?.map((t) => (
          <span key={t} className="text-[9px] bg-[#C81D6B]/10 text-[#C81D6B] px-1.5 py-0.5 rounded">
            {t}
          </span>
        ))}
        {ex.primaryMuscles.map((m) => (
          <span key={m} className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanGroupCard({
  group,
  onDropOnGroup,
  handleRemoveExercise,
  handleUpdateExerciseData,
  handleRemoveSuperset,
  exercises,
  selectedForSuperset,
  toggleSelectForSuperset,
  expandedNotes,
  toggleNotes,
}: any) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PLAN_EXERCISE',
    item: { type: 'PLAN_EXERCISE', id: group.id },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [group.id]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['PLAN_EXERCISE'],
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      onDropOnGroup(item, group.id);
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver({ shallow: true }) }),
  }), [onDropOnGroup, group.id]);

  return (
    <div
      ref={drop as any}
      className={`relative rounded-2xl bg-white border transition-colors ${
        isOver
          ? 'border-[#00796B] shadow-md ring-2 ring-[#00796B]/20 bg-[#00796B]/5'
          : group.isSuperset
          ? 'border-[#00796B] shadow-sm'
          : 'border-neutral-200 shadow-sm'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {group.isSuperset && (
        <div
          className="bg-[#00796B] text-white px-4 py-2 rounded-t-xl flex justify-between items-center text-xs font-bold uppercase tracking-wider cursor-grab active:cursor-grabbing"
          ref={drag as any}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={14} />
            <span>Superset</span>
          </div>
          <button onClick={() => handleRemoveSuperset(group.id)} className="hover:text-red-200">
            Ungroup
          </button>
        </div>
      )}

      <div className={`p-2 space-y-2 ${!group.isSuperset ? 'pt-2' : ''}`}>
        {group.items.map((pe: PlanExercise, itemIdx: number) => {
          const ex = exercises.find((e: any) => e.id === pe.exerciseId);
          if (!ex) return null;
          const isSelected = selectedForSuperset.includes(pe.id);
          const hasNotes = !!pe.notes;
          const isNotesOpen = expandedNotes.has(pe.id);
          const exerciseNumber = (group.baseIndex ?? 0) + itemIdx + 1;

          return (
            <div key={pe.id}>
              <div
                className={`p-4 rounded-xl transition-colors ${
                  isSelected ? 'bg-[#C81D6B]/5 border border-[#C81D6B]/30' : 'bg-white hover:bg-neutral-50'
                } ${!group.isSuperset ? 'border border-transparent hover:border-neutral-100' : ''}`}
              >
                {/* Row 1: Exercise name + actions */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#121212] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {exerciseNumber}
                  </span>

                  {!group.isSuperset && (
                    <button
                      onClick={() => toggleSelectForSuperset(pe.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected ? 'bg-[#C81D6B] border-[#C81D6B] text-white' : 'border-neutral-300'
                      }`}
                    >
                      {isSelected && <CheckSquare size={12} />}
                    </button>
                  )}

                  {!group.isSuperset && (
                    <div className="text-neutral-400 cursor-grab active:cursor-grabbing shrink-0" ref={drag as any}>
                      <GripVertical size={16} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#121212]">{ex.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {ex.primaryMuscles.map((m: string) => (
                        <span key={m} className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                      {ex.equipment.length > 0 && (
                        <span className="text-[10px] text-neutral-400">{ex.equipment.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleNotes(pe.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        hasNotes
                          ? 'text-[#00796B] bg-[#00796B]/10'
                          : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
                      }`}
                      title="Coaching notes"
                    >
                      <MessageSquare size={15} />
                    </button>
                    <button
                      onClick={() => handleRemoveExercise(pe.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Sets / Reps / RIR inputs */}
                <div className="flex gap-3 pl-0">
                  <div className="flex flex-col">
                    <label className="text-[10px] text-neutral-400 uppercase font-semibold mb-1">Sets</label>
                    <input
                      type="number"
                      value={pe.sets}
                      onChange={(e) => handleUpdateExerciseData(pe.id, 'sets', parseInt(e.target.value))}
                      className="w-16 p-2 text-sm border border-neutral-200 rounded-lg text-center focus:outline-none focus:border-[#C81D6B] bg-neutral-50"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-neutral-400 uppercase font-semibold mb-1">Reps</label>
                    <input
                      type="text"
                      value={pe.reps}
                      onChange={(e) => handleUpdateExerciseData(pe.id, 'reps', e.target.value)}
                      className="w-24 p-2 text-sm border border-neutral-200 rounded-lg text-center focus:outline-none focus:border-[#C81D6B] bg-neutral-50"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-neutral-400 uppercase font-semibold mb-1">RIR</label>
                    <input
                      type="number"
                      value={pe.rir}
                      onChange={(e) => handleUpdateExerciseData(pe.id, 'rir', parseInt(e.target.value))}
                      className="w-16 p-2 text-sm border border-neutral-200 rounded-lg text-center focus:outline-none focus:border-[#C81D6B] bg-neutral-50"
                    />
                  </div>
                </div>
              </div>

              {/* Notes textarea */}
              <AnimatePresence>
                {isNotesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={pe.notes || ''}
                      onChange={(e) => handleUpdateExerciseData(pe.id, 'notes', e.target.value)}
                      placeholder="Add coaching notes (form cues, tempo, etc.)"
                      className="w-full mt-2 p-3 text-sm border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-[#00796B] resize-none min-h-[60px]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {isOver && (
        <div className="absolute inset-0 bg-[#C81D6B]/10 rounded-2xl flex items-center justify-center backdrop-blur-[1px] z-10 pointer-events-none">
          <div className="bg-white text-[#C81D6B] font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
            <Plus size={18} /> Add to Superset
          </div>
        </div>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

export interface PlanBuilderProps {
  /** Header center — rendered between the back button and the right-side actions */
  headerCenter: React.ReactNode;
  /** Header right side — action buttons (save, template picker, etc.) */
  headerRight: React.ReactNode;
  /** Extra content below "Add Week" in the left sidebar */
  sidebarFooterExtra?: React.ReactNode;
  /** Number of weeks that existed before this editing session (0 for new templates) */
  originalWeekCount?: number;
  /** Initial weeks to populate the builder with */
  initialWeeks: PlanWeek[];
  /** Callback to navigate back */
  onBack: () => void;
  /** Called whenever weeks change so the parent can track current state */
  onWeeksChange?: (weeks: PlanWeek[]) => void;
  /** Additional content rendered alongside the builder (e.g., template picker modal) */
  children?: React.ReactNode;
  /** ID prefix for generated element IDs (avoids collisions between modes) */
  idPrefix?: string;
}

// ── Shared PlanBuilder Component ──────────────────────────────────────

export function PlanBuilder({
  headerCenter,
  headerRight,
  sidebarFooterExtra,
  originalWeekCount = 0,
  initialWeeks,
  onBack,
  onWeeksChange,
  children,
  idPrefix = 'pb',
}: PlanBuilderProps) {
  const { exercises } = useTraining();

  // ── Core builder state ─────────────────────────────────────────────
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [selectedForSuperset, setSelectedForSuperset] = useState<string[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Week action dropdown
  const [openWeekAction, setOpenWeekAction] = useState<number | null>(null);

  // Drawer state (responsive slide-overs)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // ── Initialize from props ──────────────────────────────────────────
  useEffect(() => {
    if (initialWeeks.length > 0) {
      setWeeks(initialWeeks);
      setActiveWeekIdx(0);
      setActiveDayIdx(0);
      setSelectedForSuperset([]);
    }
  }, [initialWeeks]);

  // ── Notify parent of week changes ──────────────────────────────────
  useEffect(() => {
    if (onWeeksChange && weeks.length > 0) {
      onWeeksChange(weeks);
    }
  }, [weeks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notes toggle ───────────────────────────────────────────────────
  const toggleNotes = (peId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(peId)) next.delete(peId);
      else next.add(peId);
      return next;
    });
  };

  // ── Derived ────────────────────────────────────────────────────────
  const activeWeek = weeks[activeWeekIdx];
  const activeDay = activeWeek?.days[activeDayIdx];

  const groupedExercises = useMemo(() => {
    if (!activeDay) return [];
    const groups: { id: string; isSuperset: boolean; items: PlanExercise[] }[] = [];
    const processedIds = new Set<string>();
    activeDay.exercises.forEach((pe) => {
      if (processedIds.has(pe.id)) return;
      if (pe.supersetId) {
        const ssItems = activeDay.exercises.filter((e) => e.supersetId === pe.supersetId);
        groups.push({ isSuperset: true, id: pe.supersetId, items: ssItems });
        ssItems.forEach((i) => processedIds.add(i.id));
      } else {
        groups.push({ isSuperset: false, id: pe.id, items: [pe] });
        processedIds.add(pe.id);
      }
    });
    return groups;
  }, [activeDay]);

  const filteredLibrary = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.primaryMuscles.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      if (activeFilters.length === 0) return true;

      const hasEquipment = ex.equipment.length > 0 && !ex.equipment.includes('None');
      const isNoEquipment = ex.equipment.length === 0;

      for (const filter of activeFilters) {
        if (filter === 'Equipment' && !hasEquipment) return false;
        if (filter === 'No Equipment' && !isNoEquipment) return false;
        if (['Strength', 'Hypertrophy', 'Recovery'].includes(filter)) {
          if (!ex.tags?.includes(filter)) return false;
        }
      }
      return true;
    });
  }, [exercises, searchQuery, activeFilters]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]));
  };

  // ── Week / Day manipulation ────────────────────────────────────────

  const updateActiveDayExercises = (newExercises: PlanExercise[]) => {
    setWeeks((prev) =>
      prev.map((week, wIdx) => {
        if (wIdx !== activeWeekIdx) return week;
        return {
          ...week,
          days: week.days.map((day, dIdx) => {
            if (dIdx !== activeDayIdx) return day;
            return { ...day, exercises: newExercises };
          }),
        };
      })
    );
  };

  const handleUpdateDayType = (type: DayType) => {
    setWeeks((prev) =>
      prev.map((week, wIdx) => {
        if (wIdx !== activeWeekIdx) return week;
        return {
          ...week,
          days: week.days.map((day, dIdx) => {
            if (dIdx !== activeDayIdx) return day;
            return { ...day, type, exercises: type === 'Rest' ? [] : day.exercises };
          }),
        };
      })
    );
  };

  const handleAddWeek = () => {
    const newOrder = weeks.length + 1;
    const ts = Date.now();
    const newWeek: PlanWeek = {
      id: `${idPrefix}-w-${ts}-${Math.random().toString(36).slice(2)}`,
      order: newOrder,
      isDeload: false,
      days: Array.from({ length: 7 }).map((_, j) => ({
        id: `${idPrefix}-d-${ts}-${j}-${Math.random().toString(36).slice(2)}`,
        dayOfWeek: j,
        type: 'Rest' as DayType,
        exercises: [],
      })),
    };
    setWeeks([...weeks, newWeek]);
    setActiveWeekIdx(weeks.length);
    setActiveDayIdx(0);
    toast.success(`Week ${newOrder} added`);
  };

  const handleRemoveWeek = (wIdx: number) => {
    if (weeks.length <= 1) {
      toast.error('Plan must have at least 1 week');
      return;
    }
    if (originalWeekCount > 0 && wIdx < originalWeekCount) {
      toast.error('Cannot remove existing plan weeks');
      return;
    }
    const newWeeks = weeks.filter((_, i) => i !== wIdx).map((w, i) => ({ ...w, order: i + 1 }));
    setWeeks(newWeeks);
    if (activeWeekIdx >= newWeeks.length) {
      setActiveWeekIdx(newWeeks.length - 1);
    }
    setOpenWeekAction(null);
  };

  const deepCopyWeekDays = (sourceDays: PlanDay[]) => {
    const copied: PlanDay[] = JSON.parse(JSON.stringify(sourceDays));
    const ssMap = new Map<string, string>();
    copied.forEach((d) => {
      d.id = `${idPrefix}-d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      d.exercises.forEach((e) => {
        e.id = `${idPrefix}-pe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (e.supersetId) {
          if (!ssMap.has(e.supersetId)) {
            ssMap.set(e.supersetId, `${idPrefix}-ss-${Date.now()}-${Math.random().toString(36).slice(2)}`);
          }
          e.supersetId = ssMap.get(e.supersetId);
        }
      });
    });
    return copied;
  };

  const handleCopyWeek = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;
    setWeeks((prev) => {
      const w = [...prev];
      w[targetIdx] = { ...w[targetIdx], days: deepCopyWeekDays(w[sourceIdx].days) };
      return w;
    });
    toast.success(`Copied Week ${sourceIdx + 1} to Week ${targetIdx + 1}`);
    setOpenWeekAction(null);
  };

  const handleApplyWeekToAll = (sourceIdx: number) => {
    setWeeks((prev) => {
      const w = [...prev];
      for (let i = 0; i < w.length; i++) {
        if (i === sourceIdx) continue;
        w[i] = { ...w[i], days: deepCopyWeekDays(w[sourceIdx].days) };
      }
      return w;
    });
    toast.success(`Week ${sourceIdx + 1} applied to all weeks`);
  };

  const handleSwapWeek = (idxA: number, idxB: number) => {
    if (idxA === idxB) return;
    setWeeks((prev) => {
      const w = [...prev];
      const tempDays = w[idxA].days;
      w[idxA] = { ...w[idxA], days: w[idxB].days };
      w[idxB] = { ...w[idxB], days: tempDays };
      return w;
    });
    toast.success(`Swapped Week ${idxA + 1} and Week ${idxB + 1}`);
    setOpenWeekAction(null);
  };

  const toggleDeload = (wIdx: number) => {
    setWeeks((prev) => prev.map((week, i) => (i === wIdx ? { ...week, isDeload: !week.isDeload } : week)));
  };

  // ── Drag-drop handlers ─────────────────────────────────────────────

  const handleDropOnSeparator = (dragItem: any, targetIndex: number) => {
    let newGroups = [...groupedExercises];

    if (dragItem.type === 'LIBRARY_EXERCISE') {
      const newPe: PlanExercise = {
        id: `${idPrefix}-pe-${Date.now()}`,
        exerciseId: dragItem.exercise.id,
        sets: 3,
        reps: '10',
        rir: 2,
      };
      newGroups.splice(targetIndex, 0, { id: newPe.id, isSuperset: false, items: [newPe] });
    } else if (dragItem.type === 'PLAN_EXERCISE') {
      const oldIndex = newGroups.findIndex((g) => g.id === dragItem.id);
      if (oldIndex === -1) return;
      const [movedGroup] = newGroups.splice(oldIndex, 1);
      let finalIndex = targetIndex;
      if (oldIndex < targetIndex) finalIndex -= 1;
      newGroups.splice(finalIndex, 0, movedGroup);
    }

    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
  };

  const handleDropOnGroup = (dragItem: any, targetGroupId: string) => {
    let newGroups = [...groupedExercises];
    const targetGroup = newGroups.find((g) => g.id === targetGroupId);
    if (!targetGroup) return;
    if (dragItem.id === targetGroupId) return;

    let draggedItems: PlanExercise[] = [];

    if (dragItem.type === 'LIBRARY_EXERCISE') {
      draggedItems = [
        { id: `${idPrefix}-pe-${Date.now()}`, exerciseId: dragItem.exercise.id, sets: 3, reps: '10', rir: 2 },
      ];
    } else if (dragItem.type === 'PLAN_EXERCISE') {
      const oldIndex = newGroups.findIndex((g) => g.id === dragItem.id);
      if (oldIndex === -1) return;
      const [movedGroup] = newGroups.splice(oldIndex, 1);
      draggedItems = movedGroup.items;
    }

    if (!targetGroup.isSuperset) {
      targetGroup.isSuperset = true;
      targetGroup.id = `${idPrefix}-ss-${Date.now()}`;
      targetGroup.items.forEach((pe) => (pe.supersetId = targetGroup.id));
    }

    draggedItems.forEach((pe) => {
      pe.supersetId = targetGroup.id;
      targetGroup.items.push(pe);
    });

    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
  };

  const handleRemoveExercise = (peId: string) => {
    const newGroups = [...groupedExercises];
    for (let i = 0; i < newGroups.length; i++) {
      const g = newGroups[i];
      const peIdx = g.items.findIndex((pe) => pe.id === peId);
      if (peIdx !== -1) {
        g.items.splice(peIdx, 1);
        if (g.items.length === 0) {
          newGroups.splice(i, 1);
        } else if (g.isSuperset && g.items.length === 1) {
          g.items[0].supersetId = undefined;
          newGroups[i] = { id: g.items[0].id, isSuperset: false, items: g.items };
        }
        break;
      }
    }
    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
    setSelectedForSuperset((prev) => prev.filter((id) => id !== peId));
  };

  const handleRemoveSuperset = (supersetId: string) => {
    const newGroups = [...groupedExercises];
    const idx = newGroups.findIndex((g) => g.id === supersetId);
    if (idx === -1) return;
    const group = newGroups[idx];
    const newIndividualGroups = group.items.map((pe) => {
      pe.supersetId = undefined;
      return { id: pe.id, isSuperset: false, items: [pe] };
    });
    newGroups.splice(idx, 1, ...newIndividualGroups);
    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
  };

  const handleUpdateExerciseData = (peId: string, field: keyof PlanExercise, value: any) => {
    setWeeks((prev) =>
      prev.map((week, wIdx) => {
        if (wIdx !== activeWeekIdx) return week;
        return {
          ...week,
          days: week.days.map((day, dIdx) => {
            if (dIdx !== activeDayIdx) return day;
            return {
              ...day,
              exercises: day.exercises.map((pe) => (pe.id === peId ? { ...pe, [field]: value } : pe)),
            };
          }),
        };
      })
    );
  };

  const handleGroupSuperset = () => {
    if (selectedForSuperset.length < 2) return;
    const supersetId = `${idPrefix}-ss-${Date.now()}`;
    const newGroups = [...groupedExercises];
    const itemsToGroup: PlanExercise[] = [];

    for (let i = newGroups.length - 1; i >= 0; i--) {
      const g = newGroups[i];
      const selected = g.items.filter((pe) => selectedForSuperset.includes(pe.id));
      const kept = g.items.filter((pe) => !selectedForSuperset.includes(pe.id));

      itemsToGroup.unshift(...selected);

      if (kept.length === 0) {
        newGroups.splice(i, 1);
      } else {
        if (g.isSuperset && kept.length === 1) {
          kept[0].supersetId = undefined;
          newGroups[i] = { id: kept[0].id, isSuperset: false, items: kept };
        } else {
          newGroups[i] = { ...g, items: kept };
        }
      }
    }

    itemsToGroup.forEach((pe) => (pe.supersetId = supersetId));
    newGroups.push({ id: supersetId, isSuperset: true, items: itemsToGroup });

    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
    setSelectedForSuperset([]);
    toast.success('Superset created!');
  };

  const handleQuickAdd = (exercise: Exercise) => {
    if (!activeDay || activeDay.type === 'Rest') {
      toast.error('Set a training day type first');
      return;
    }
    const newPe: PlanExercise = {
      id: `${idPrefix}-pe-${Date.now()}`,
      exerciseId: exercise.id,
      sets: 3,
      reps: '10',
      rir: 2,
    };
    updateActiveDayExercises([...activeDay.exercises, newPe]);
    toast.success(`Added ${exercise.name}`);
  };

  // ── Checks ─────────────────────────────────────────────────────────

  const activeWeekHasContent = activeWeek?.days.some((d) => d.type !== 'Rest' && d.exercises.length > 0);

  if (!activeDay && weeks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="text-center">
          <Activity size={48} className="mx-auto mb-4 text-neutral-300" />
          <h2 className="text-xl font-bold text-[#121212] mb-2">Loading...</h2>
          <p className="text-neutral-500 mb-6">Preparing the plan builder.</p>
        </div>
      </div>
    );
  }

  if (!activeDay) return null;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Full-screen takeover -- no coach sidebar */}
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F8F8]">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="h-14 px-4 lg:px-6 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="p-2 text-neutral-500 hover:text-[#121212] hover:bg-neutral-100 rounded-xl transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            {/* Plan structure toggle -- visible on small screens only */}
            <button
              onClick={() => { setLeftDrawerOpen(true); setRightDrawerOpen(false); }}
              className="xl:hidden p-2 text-neutral-500 hover:text-[#121212] hover:bg-neutral-100 rounded-xl transition-colors shrink-0"
              title="Plan Structure"
            >
              <PanelLeftOpen size={20} />
            </button>
            {headerCenter}
          </div>
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Exercise library toggle -- visible on small screens only */}
            <button
              onClick={() => { setRightDrawerOpen(true); setLeftDrawerOpen(false); }}
              className="xl:hidden p-2 text-neutral-500 hover:text-[#121212] hover:bg-neutral-100 rounded-xl transition-colors"
              title="Exercise Library"
            >
              <Library size={20} />
            </button>
            {headerRight}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Backdrop for drawers on small screens */}
          <AnimatePresence>
            {(leftDrawerOpen || rightDrawerOpen) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="xl:hidden fixed inset-0 bg-black/30 z-40"
                onClick={() => { setLeftDrawerOpen(false); setRightDrawerOpen(false); }}
              />
            )}
          </AnimatePresence>

          {/* ── Left Sidebar: Plan Structure ── */}
          <div
            className={`bg-white border-r border-neutral-200 flex flex-col shrink-0 transition-transform duration-300 ease-out ${
              leftDrawerOpen
                ? 'fixed inset-y-0 left-0 z-50 w-80 shadow-2xl translate-x-0'
                : 'fixed inset-y-0 left-0 z-50 w-80 -translate-x-full xl:translate-x-0 xl:relative xl:w-72 xl:shadow-none'
            }`}
          >
            {/* Drawer close button -- small screens only */}
            <div className="xl:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <span className="font-bold text-sm text-[#121212]">Plan Structure</span>
              <button onClick={() => setLeftDrawerOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-neutral-100">
              <h2 className="font-bold text-[#121212] uppercase tracking-wider text-xs">Plan Structure</h2>
              {originalWeekCount > 0 && (
                <p className="text-[10px] text-neutral-400 mt-1">
                  {originalWeekCount} existing {originalWeekCount === 1 ? 'week' : 'weeks'}
                  {weeks.length > originalWeekCount && ` + ${weeks.length - originalWeekCount} new`}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {weeks.map((week, wIdx) => {
                const isExistingWeek = originalWeekCount > 0 && wIdx < originalWeekCount;
                const isNewWeek = originalWeekCount > 0 && wIdx >= originalWeekCount;

                return (
                  <div key={week.id} className="border-b border-neutral-100">
                    <div
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors group relative ${
                        activeWeekIdx === wIdx ? 'bg-neutral-50' : ''
                      } ${isNewWeek ? 'border-l-[3px] border-l-[#C81D6B]' : ''}`}
                      onClick={() => setActiveWeekIdx(wIdx)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#121212]">Week {week.order}</span>
                        {week.isDeload && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Deload
                          </span>
                        )}
                        {isExistingWeek && (
                          <span className="text-[9px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-medium">
                            Existing
                          </span>
                        )}
                        {isNewWeek && (
                          <span className="text-[9px] bg-[#C81D6B]/10 text-[#C81D6B] px-1.5 py-0.5 rounded font-bold">
                            New
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Copy Week */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md text-neutral-400 hover:text-[#C81D6B] hover:bg-[#C81D6B]/10 transition-colors"
                              title="Copy week"
                            >
                              <Copy size={14} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-52 p-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50"
                          >
                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-2 py-1.5">
                              Copy Week {wIdx + 1} to:
                            </p>
                            <div className="space-y-0.5 max-h-40 overflow-y-auto">
                              {weeks.map(
                                (_, i) =>
                                  i !== wIdx && (
                                    <button
                                      key={i}
                                      onClick={() => handleCopyWeek(wIdx, i)}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 rounded-lg text-[#121212]"
                                    >
                                      Week {i + 1}
                                    </button>
                                  )
                              )}
                            </div>
                            {weeks.length > 2 && (
                              <div className="border-t border-neutral-100 mt-1 pt-1">
                                <button
                                  onClick={() => handleApplyWeekToAll(wIdx)}
                                  className="w-full text-left px-3 py-2 text-sm font-semibold text-[#C81D6B] hover:bg-[#C81D6B]/5 rounded-lg"
                                >
                                  Apply to All Weeks
                                </button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>

                        {/* Toggle deload */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDeload(wIdx);
                          }}
                          title="Toggle Deload"
                          className={`p-1.5 rounded-md ${
                            week.isDeload
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-neutral-400 hover:bg-neutral-200 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Info size={14} />
                        </button>

                        {/* More actions */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenWeekAction(openWeekAction === wIdx ? null : wIdx);
                            }}
                            className="p-1.5 rounded-md text-neutral-400 hover:bg-neutral-200 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical size={14} />
                          </button>

                          <AnimatePresence>
                            {openWeekAction === wIdx && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-xl border border-neutral-100 py-1 z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-100">
                                  Swap With...
                                </div>
                                <div className="max-h-32 overflow-y-auto">
                                  {weeks.map(
                                    (_, i) =>
                                      i !== wIdx && (
                                        <button
                                          key={`swap-${i}`}
                                          onClick={() => handleSwapWeek(wIdx, i)}
                                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-[#121212] flex items-center gap-2"
                                        >
                                          <ArrowLeftRight size={14} className="text-neutral-400" /> Week {i + 1}
                                        </button>
                                      )
                                  )}
                                </div>
                                {/* Show delete only when allowed: template mode (originalWeekCount===0) always, client mode only for new weeks */}
                                {(originalWeekCount === 0 || isNewWeek) && (
                                  <div className="border-t border-neutral-100 mt-1">
                                    <button
                                      onClick={() => handleRemoveWeek(wIdx)}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> Delete Week
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Day list (expanded for active week) */}
                    {activeWeekIdx === wIdx && (
                      <div className="px-3 pb-3 space-y-1">
                        {DAY_NAMES.map((dName, dIdx) => {
                          const day = week.days[dIdx];
                          const isActive = activeDayIdx === dIdx;
                          const exCount = day.exercises.length;
                          return (
                            <button
                              key={dIdx}
                              onClick={() => setActiveDayIdx(dIdx)}
                              className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                isActive
                                  ? 'bg-[#C81D6B]/5 font-semibold text-[#C81D6B]'
                                  : 'text-neutral-600 hover:bg-neutral-100'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                {dName}
                                {day.type !== 'Rest' && exCount > 0 && (
                                  <span className="text-[9px] bg-neutral-200 text-neutral-600 w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    {exCount}
                                  </span>
                                )}
                                {day.type !== 'Rest' && exCount === 0 && (
                                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="No exercises yet" />
                                )}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                                  day.type === 'Rest'
                                    ? 'text-neutral-400'
                                    : day.type === 'Strength'
                                    ? 'bg-[#121212] text-white'
                                    : day.type === 'Hypertrophy'
                                    ? 'bg-[#00796B]/10 text-[#00796B]'
                                    : day.type === 'Recovery'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {day.type !== 'Rest' && day.type}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-neutral-200 bg-neutral-50 shrink-0 space-y-2">
              <button
                onClick={handleAddWeek}
                className="w-full py-2.5 flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-[#121212] font-semibold text-sm rounded-xl transition-colors border border-neutral-200 shadow-sm"
              >
                <Plus size={16} /> Add Week
              </button>
              {sidebarFooterExtra}
            </div>
          </div>

          {/* ── Middle Content: Day Builder ─────────────────────── */}
          <div className="flex-1 flex flex-col bg-[#FAFAFA] overflow-hidden min-w-0">
            {/* Week overview bar */}
            <div className="p-4 pb-2 border-b border-neutral-200 bg-white shrink-0">
              {/* Week pills */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                {weeks.map((week, wIdx) => {
                  const isNewWeek = originalWeekCount > 0 && wIdx >= originalWeekCount;
                  return (
                    <button
                      key={week.id}
                      onClick={() => setActiveWeekIdx(wIdx)}
                      className={`shrink-0 flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all relative ${
                        activeWeekIdx === wIdx
                          ? 'bg-[#C81D6B] border-[#C81D6B] text-white shadow-md'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'
                      }`}
                    >
                      {isNewWeek && activeWeekIdx !== wIdx && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C81D6B]" />
                      )}
                      <span className="text-xs font-bold whitespace-nowrap">
                        W{week.order}
                        {week.isDeload && <span className="ml-1 opacity-70">D</span>}
                      </span>
                      {/* Day dots */}
                      <div className="flex gap-[3px]">
                        {week.days.map((day, dIdx) => {
                          const color = getDayTypeColor(day.type);
                          const hasExercises = day.exercises.length > 0;
                          const isActiveDay = activeWeekIdx === wIdx && activeDayIdx === dIdx;
                          return (
                            <button
                              key={dIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveWeekIdx(wIdx);
                                setActiveDayIdx(dIdx);
                              }}
                              className="relative"
                              title={`${DAY_NAMES[dIdx]} - ${day.type}`}
                            >
                              <div
                                className={`w-2.5 h-2.5 rounded-full transition-all ${
                                  isActiveDay ? 'ring-2 ring-offset-1 ring-[#C81D6B]' : ''
                                }`}
                                style={{
                                  backgroundColor: hasExercises || day.type === 'Rest' ? color : 'transparent',
                                  border: !hasExercises && day.type !== 'Rest' ? `2px solid ${color}` : 'none',
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current day heading + type selector */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-[#121212]">
                  {DAY_NAMES_FULL[activeDayIdx]}
                  {originalWeekCount > 0 && (
                    <span className="ml-3 text-sm font-normal text-neutral-400">
                      Week {activeWeek?.order}
                      {activeWeek && activeWeekIdx >= originalWeekCount && (
                        <span className="ml-2 text-[10px] font-bold text-[#C81D6B] bg-[#C81D6B]/10 px-1.5 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                    </span>
                  )}
                </h3>
                {activeWeekHasContent && weeks.length > 1 && (
                  <button
                    onClick={() => handleApplyWeekToAll(activeWeekIdx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00796B] bg-[#00796B]/5 border border-[#00796B]/20 rounded-lg hover:bg-[#00796B]/10 transition-colors"
                  >
                    <Layers size={14} />
                    Apply week to all
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {DAY_TYPES.map((type) => {
                  const isSelected = activeDay.type === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleUpdateDayType(type)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                        isSelected
                          ? 'bg-[#C81D6B] border-[#C81D6B] text-white shadow-md'
                          : 'bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:text-[#121212]'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercise list area */}
            <div className="flex-1 overflow-y-auto relative">
              {activeWeek?.isDeload && (
                <div className="mx-8 mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                  <Info className="text-blue-600 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h4 className="text-blue-800 font-bold text-base uppercase tracking-wider">Deload Week</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This is a planned deload week. Consider reducing sets, lowering reps, or increasing RIR to
                      prioritize recovery.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-8 max-w-4xl mx-auto h-full">
                {activeDay.type === 'Rest' ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-20">
                    <Activity size={64} className="mb-6 opacity-20" />
                    <p className="text-xl font-medium text-neutral-500 mb-2">Rest Day</p>
                    <p className="text-sm">Enjoy the recovery. No exercises for this day.</p>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col min-h-full">
                    {/* Superset selection bar */}
                    {selectedForSuperset.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-xl border border-[#C81D6B] shadow-lg flex items-center justify-between mb-6 sticky top-4 z-20"
                      >
                        <span className="text-sm font-semibold text-[#C81D6B]">
                          {selectedForSuperset.length} exercises selected
                        </span>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setSelectedForSuperset([])}
                            className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleGroupSuperset}
                            className="px-4 py-2 text-sm font-semibold bg-[#C81D6B] text-white rounded-lg shadow-sm hover:bg-[#a31556] transition-colors"
                          >
                            Create Superset
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {groupedExercises.length === 0 ? (
                      <EmptyDropTarget onDrop={(item: any) => handleDropOnSeparator(item, 0)} />
                    ) : (
                      <>
                        <DropSeparator index={0} onDrop={handleDropOnSeparator} />
                        {groupedExercises.map((group, gIdx) => {
                          const baseIndex = groupedExercises
                            .slice(0, gIdx)
                            .reduce((sum, g) => sum + g.items.length, 0);
                          const isLast = gIdx === groupedExercises.length - 1;
                          return (
                            <React.Fragment key={group.id}>
                              <PlanGroupCard
                                group={{ ...group, baseIndex }}
                                onDropOnGroup={handleDropOnGroup}
                                handleRemoveExercise={handleRemoveExercise}
                                handleUpdateExerciseData={handleUpdateExerciseData}
                                handleRemoveSuperset={handleRemoveSuperset}
                                exercises={exercises}
                                selectedForSuperset={selectedForSuperset}
                                toggleSelectForSuperset={(id: string) => {
                                  if (selectedForSuperset.includes(id))
                                    setSelectedForSuperset((prev) => prev.filter((p) => p !== id));
                                  else setSelectedForSuperset((prev) => [...prev, id]);
                                }}
                                expandedNotes={expandedNotes}
                                toggleNotes={toggleNotes}
                              />
                              {isLast ? (
                                <DropSeparator index={gIdx + 1} onDrop={handleDropOnSeparator} isTrailing />
                              ) : (
                                <DropSeparator index={gIdx + 1} onDrop={handleDropOnSeparator} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Sidebar: Exercise Library ── */}
          <div
            className={`bg-white border-l border-neutral-200 flex flex-col shrink-0 z-10 transition-transform duration-300 ease-out ${
              rightDrawerOpen
                ? 'fixed inset-y-0 right-0 z-50 w-80 shadow-2xl translate-x-0'
                : 'fixed inset-y-0 right-0 z-50 w-80 translate-x-full xl:translate-x-0 xl:relative xl:w-80 xl:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]'
            }`}
          >
            <div className="p-4 border-b border-neutral-100 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#121212] uppercase tracking-wider text-xs">Exercise Library</h3>
                <button onClick={() => setRightDrawerOpen(false)} className="xl:hidden p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#C81D6B] focus:bg-white transition-colors"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Filter size={16} />
                    <span>Filters {activeFilters.length > 0 && `(${activeFilters.length})`}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 shadow-xl rounded-xl p-3 z-50"
                    >
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Goals</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {['Strength', 'Hypertrophy', 'Recovery'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleFilter(tag)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                              activeFilters.includes(tag)
                                ? 'bg-[#C81D6B]/10 border-[#C81D6B]/30 text-[#C81D6B]'
                                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Equipment</p>
                      <div className="flex flex-wrap gap-2">
                        {['Equipment', 'No Equipment'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleFilter(tag)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                              activeFilters.includes(tag)
                                ? 'bg-[#00796B]/10 border-[#00796B]/30 text-[#00796B]'
                                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
              {filteredLibrary.map((ex) => (
                <LibraryExerciseCard key={ex.id} ex={ex} onQuickAdd={handleQuickAdd} />
              ))}
              {filteredLibrary.length === 0 && (
                <div className="text-center text-sm text-neutral-400 py-8">No exercises match your filters.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {children}
    </DndProvider>
  );
}

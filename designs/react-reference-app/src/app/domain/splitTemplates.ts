import type { Exercise } from '../context/TrainingContext';
import type { MovementPattern } from './exercises';
import { WEEKDAYS, type Block, type Session, type Slot, type SplitShape, type Weekday } from './program';

export type SlotPlan = { slot: Slot; patterns: MovementPattern[]; label: string };
export type SessionTemplate = { name: string; slots: SlotPlan[] };
export type SplitTemplate = {
  shape: SplitShape;
  label: string;
  sessions: (days: number) => SessionTemplate[];
  layout: (sessionCount: number) => Weekday[];
};

const SESSION_LETTERS = ['A', 'B', 'C', 'D', 'E'];
const PATTERN_FAMILIES: readonly MovementPattern[][] = [
  ['squat', 'hinge', 'lunge'],
  ['horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull'],
];
const CHOOSABLE_SLOTS: readonly Slot[] = ['A', 'B'];
const SLOT_LABELS: Record<Slot, string> = { A: 'Main lift', B: 'Secondary', C: 'Accessories', D: 'Core / finisher' };
const CORE: SlotPlan = { slot: 'D', patterns: ['core'], label: SLOT_LABELS.D };
const ISOLATION: SlotPlan = { slot: 'C', patterns: ['isolation'], label: SLOT_LABELS.C };
const FALLBACK_SLOT_PLANS: Record<Slot, SlotPlan> = {
  A: { slot: 'A', patterns: [], label: SLOT_LABELS.A },
  B: { slot: 'B', patterns: [], label: SLOT_LABELS.B },
  C: ISOLATION,
  D: CORE,
};

function mainAndSecondary(main: MovementPattern[], secondary: MovementPattern[]): SlotPlan[] {
  return [
    { slot: 'A', patterns: main, label: SLOT_LABELS.A },
    { slot: 'B', patterns: secondary, label: SLOT_LABELS.B },
  ];
}

function sessionTemplate(name: string, main: MovementPattern[], secondary: MovementPattern[]): SessionTemplate {
  return { name, slots: [...mainAndSecondary(main, secondary), ISOLATION, CORE] };
}

const FULL_BODY_LOWER: [MovementPattern[], MovementPattern[]][] = [
  [['squat'], ['hinge', 'lunge']],
  [['hinge'], ['squat', 'lunge']],
];
const FULL_BODY_ACCESSORIES: SlotPlan[] = [
  { slot: 'C', patterns: ['horizontal-push', 'vertical-push'], label: SLOT_LABELS.C },
  { slot: 'C', patterns: ['horizontal-pull', 'vertical-pull'], label: SLOT_LABELS.C },
];

function fullBodySessions(days: number): SessionTemplate[] {
  return SESSION_LETTERS.slice(0, days).map((letter, index) => {
    const [main, secondary] = FULL_BODY_LOWER[index % FULL_BODY_LOWER.length];
    return { name: `Full Body ${letter}`, slots: [...mainAndSecondary(main, secondary), ...FULL_BODY_ACCESSORIES, CORE] };
  });
}

const UPPER_LOWER_SESSIONS: SessionTemplate[] = [
  sessionTemplate('Lower A', ['squat'], ['hinge', 'lunge']),
  sessionTemplate('Upper A', ['horizontal-push'], ['vertical-pull', 'horizontal-pull']),
  sessionTemplate('Lower B', ['hinge'], ['lunge', 'squat']),
  sessionTemplate('Upper B', ['vertical-pull'], ['vertical-push', 'horizontal-push']),
  sessionTemplate('Lower C', ['squat'], ['hinge', 'lunge']),
];

const LAYOUTS: Partial<Record<number, Weekday[]>> = {
  2: ['mon', 'thu'],
  3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'fri', 'sat'],
};

function layout(sessionCount: number): Weekday[] {
  return [...(LAYOUTS[sessionCount] ?? WEEKDAYS.slice(0, sessionCount))];
}

export const SPLIT_TEMPLATES: Record<SplitShape, SplitTemplate> = {
  'full-body': {
    shape: 'full-body',
    label: 'Full Body',
    sessions: fullBodySessions,
    layout,
  },
  'upper-lower': {
    shape: 'upper-lower',
    label: 'Upper / Lower',
    sessions: days => UPPER_LOWER_SESSIONS.slice(0, days),
    layout,
  },
};

function templatePlanFor(block: Block, session: Session, slot: Slot): SlotPlan | undefined {
  const index = block.sessions.findIndex(other => other.id === session.id);
  if (index < 0) return undefined;
  const template = SPLIT_TEMPLATES[block.split.shape].sessions(block.sessions.length)[index];
  const plans = template?.slots.filter(plan => plan.slot === slot) ?? [];
  const [first] = plans;
  if (!first) return undefined;
  return { ...first, patterns: plans.flatMap(plan => plan.patterns) };
}

export function slotPlanFor(block: Block, session: Session, slot: Slot): SlotPlan | undefined {
  const plan = templatePlanFor(block, session, slot);
  const chosen = session.slotPatterns?.[slot];
  return plan && chosen ? { ...plan, patterns: chosen } : plan;
}

export function patternChoicesFor(block: Block, session: Session, slot: Slot): MovementPattern[] {
  if (!CHOOSABLE_SLOTS.includes(slot)) return [];
  const defaults = templatePlanFor(block, session, slot)?.patterns ?? [];
  const family = PATTERN_FAMILIES.find(patterns => defaults.length > 0 && defaults.every(pattern => patterns.includes(pattern)));
  return family ? [...family] : [];
}

function inFamilyOrder(patterns: readonly MovementPattern[], choices: readonly MovementPattern[]): MovementPattern[] {
  return choices.filter(pattern => patterns.includes(pattern));
}

export function withMainPattern(block: Block, session: Session, pattern: MovementPattern): Session {
  const [previous] = slotPlanFor(block, session, 'A')?.patterns ?? [];
  const secondary = slotPlanFor(block, session, 'B')?.patterns ?? [];
  const swapsWithSecondary = previous !== undefined && secondary.includes(pattern);
  const swapped = inFamilyOrder(
    secondary.map(other => (other === pattern ? previous : other)),
    patternChoicesFor(block, session, 'B'),
  );
  const slotPatterns = { ...session.slotPatterns, A: [pattern], ...(swapsWithSecondary ? { B: swapped } : {}) };
  return { ...session, slotPatterns };
}

export function withSecondaryPatterns(block: Block, session: Session, patterns: readonly MovementPattern[]): Session {
  const slotPatterns = { ...session.slotPatterns, B: inFamilyOrder(patterns, patternChoicesFor(block, session, 'B')) };
  return { ...session, slotPatterns };
}

export function splitLabel(block: Block): string {
  return block.split.name || SPLIT_TEMPLATES[block.split.shape].label;
}

export function slotPlanOrFallback(block: Block, session: Session, slot: Slot): SlotPlan {
  return slotPlanFor(block, session, slot) ?? FALLBACK_SLOT_PLANS[slot];
}

export function slotExercisePatterns(session: Session, slot: Slot, library: readonly Exercise[]): MovementPattern[] {
  const patterns = session.rows
    .filter(row => row.slot === slot)
    .flatMap(row => library.find(exercise => exercise.id === row.exerciseId)?.pattern ?? []);
  return [...new Set(patterns)];
}

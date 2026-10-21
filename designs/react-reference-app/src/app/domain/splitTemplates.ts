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

function sessionTemplate(name: string, main: MovementPattern[], secondary: MovementPattern[]): SessionTemplate {
  return {
    name,
    slots: [
      { slot: 'A', patterns: main, label: 'Main lift' },
      { slot: 'B', patterns: secondary, label: 'Secondary' },
      { slot: 'C', patterns: ['isolation'], label: 'Accessories' },
      { slot: 'D', patterns: ['core'], label: 'Core / finisher' },
    ],
  };
}

const FULL_BODY_SESSIONS: SessionTemplate[] = [
  sessionTemplate('Full Body A', ['squat'], ['hinge', 'lunge']),
  sessionTemplate('Full Body B', ['hinge'], ['squat', 'lunge']),
  sessionTemplate('Full Body C', ['horizontal-push'], ['horizontal-pull', 'vertical-pull']),
];

const UPPER_LOWER_SESSIONS: SessionTemplate[] = [
  sessionTemplate('Lower A', ['squat'], ['hinge', 'lunge']),
  sessionTemplate('Upper A', ['horizontal-push'], ['vertical-pull', 'horizontal-pull']),
  sessionTemplate('Lower B', ['hinge'], ['lunge', 'squat']),
  sessionTemplate('Upper B', ['vertical-pull'], ['vertical-push', 'horizontal-push']),
  sessionTemplate('Lower C', ['squat'], ['hinge', 'lunge']),
];

const FULL_BODY_LAYOUTS: Partial<Record<number, Weekday[]>> = {
  2: ['mon', 'thu'],
  3: ['mon', 'wed', 'fri'],
};

const UPPER_LOWER_LAYOUTS: Partial<Record<number, Weekday[]>> = {
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'fri', 'sat'],
};

function layoutFrom(layouts: Partial<Record<number, Weekday[]>>) {
  return (sessionCount: number): Weekday[] => [...(layouts[sessionCount] ?? WEEKDAYS.slice(0, sessionCount))];
}

export const SPLIT_TEMPLATES: Record<SplitShape, SplitTemplate> = {
  'full-body': {
    shape: 'full-body',
    label: 'Full Body',
    sessions: days => FULL_BODY_SESSIONS.slice(0, days),
    layout: layoutFrom(FULL_BODY_LAYOUTS),
  },
  'upper-lower': {
    shape: 'upper-lower',
    label: 'Upper / Lower',
    sessions: days => UPPER_LOWER_SESSIONS.slice(0, days),
    layout: layoutFrom(UPPER_LOWER_LAYOUTS),
  },
};

export function slotPlanFor(block: Block, session: Session, slot: Slot): SlotPlan | undefined {
  const index = block.sessions.findIndex(other => other.id === session.id);
  if (index < 0) return undefined;
  const template = SPLIT_TEMPLATES[block.split.shape].sessions(block.sessions.length)[index];
  return template?.slots.find(plan => plan.slot === slot);
}

import type { CyclePhase } from '../../../context/CycleContext';

export const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: 'Menstrual', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal',
};
// short var names — the --color-* aliases are build-time only
export const PHASE_VAR: Record<CyclePhase, string> = {
  menstrual: 'var(--cycle-menstrual)', follicular: 'var(--cycle-follicular)',
  ovulatory: 'var(--cycle-ovulatory)', luteal: 'var(--cycle-luteal)',
};
export const MEAL_ROLE_LABEL: Record<string, string> = {
  'mt-breakfast': 'Breakfast', 'mt-lunch': 'Lunch', 'mt-dinner': 'Dinner', 'mt-snack': 'Snack',
  'mt-pre-workout': 'Pre-workout', 'mt-post-workout': 'Post-workout',
};
/** Gentle per-phase influence nudge — informational only, not a directive. */
export const PHASE_NUDGE: Record<CyclePhase, string> = {
  menstrual:  'Iron-rich foods and gentle, comforting meals can help.',
  follicular: 'Energy is rising — a good window for higher-intensity fuelling.',
  ovulatory:  'Anti-inflammatory, fibre-rich choices support this phase.',
  luteal:     'Complex carbs, magnesium, and steady meals can ease symptoms.',
};

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

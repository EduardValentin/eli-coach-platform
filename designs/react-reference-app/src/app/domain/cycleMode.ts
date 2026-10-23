import type { JourneyGender, OnboardingDraft } from './journey';

export type CycleMode = 'adapted' | 'general';

export const CYCLE_MODE_LABELS: Record<CycleMode, string> = {
  adapted: 'Adapted to symptoms',
  general: 'General',
};

const NO_PERIOD_VALUE = 'No, or very rarely';
const COMBINED_PILL_VALUE = 'Combined pill';
const PERIMENOPAUSE_VALUES = ['Yes, perimenopause', 'Yes, menopause'];

export function cycleModeOf(
  draft: OnboardingDraft,
  gender: JourneyGender,
): CycleMode | null {
  if (gender === 'male') return 'general';

  const answers = draft.answers['cycle-context'];
  if (Object.keys(answers).length === 0) return null;

  const isGeneral =
    answers.cycleRegularity === NO_PERIOD_VALUE ||
    answers.hormonalContraception === COMBINED_PILL_VALUE ||
    PERIMENOPAUSE_VALUES.includes(answers.perimenopauseOrMenopause as string);

  return isGeneral ? 'general' : 'adapted';
}

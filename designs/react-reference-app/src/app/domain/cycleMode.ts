import type { OnboardingDraft } from './journey';

export type CycleMode = 'phase-based' | 'symptom-based' | 'manual';

export const CYCLE_MODE_LABELS: Record<CycleMode, string> = {
  'phase-based': 'Phase-based',
  'symptom-based': 'Symptom-based',
  manual: 'Set by Eli',
};

const NO_PERIOD_VALUE = 'No, or very rarely';
const COMBINED_PILL_VALUE = 'Combined pill';
const NO_LIFE_STAGE_VALUE = 'None of these';

function isOnlyNoneOfThese(lifeStage: unknown): boolean {
  return (
    Array.isArray(lifeStage) &&
    lifeStage.length === 1 &&
    lifeStage[0] === NO_LIFE_STAGE_VALUE
  );
}

export function cycleModeOf(draft: OnboardingDraft): CycleMode | null {
  const answers = draft.answers['cycle-context'];
  if (Object.keys(answers).length === 0) return null;

  if (answers.hormonalContraception === 'Something else') return 'manual';

  const isPhaseBased =
    answers.cycleRegularity !== NO_PERIOD_VALUE &&
    answers.hormonalContraception !== COMBINED_PILL_VALUE &&
    isOnlyNoneOfThese(answers.lifeStage) &&
    (answers.perimenopauseOrMenopause === 'No' ||
      answers.perimenopauseOrMenopause === "I'm not sure");

  return isPhaseBased ? 'phase-based' : 'symptom-based';
}

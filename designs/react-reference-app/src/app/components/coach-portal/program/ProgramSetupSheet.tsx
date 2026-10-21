import { useId, useState } from 'react';
import { Link } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import { CYCLE_MODE_LABELS, type CycleMode } from '../../../domain/cycleMode';
import type { ClientJourney } from '../../../domain/journey';
import { findOnboardingField } from '../../../domain/onboardingSchema';
import type { LevelHint, ProgramLanguage, SplitShape } from '../../../domain/program';
import {
  equipmentChipsOf,
  equipmentForChips,
  setupFromJourney,
  type ProgramSetup,
} from '../../../domain/programOnboarding';
import { splitShapeFor } from '../../../domain/programSuggestions';
import { SPLIT_TEMPLATES } from '../../../domain/splitTemplates';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { CheckboxChip } from '../../CheckboxChip';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { SettingsRow, SettingsRows, SettingsSection } from '../../SettingsSection';
import { Button, buttonVariants } from '../../ui/button';
import { Label } from '../../ui/label';
import { OptionSelect, type Option } from './OptionSelect';

const LEVELS: Option<LevelHint>[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const TRAINING_DAYS: Option<ProgramSetup['trainingDays']>[] = [
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5+ days' },
];
const SESSION_MINUTES: Option<ProgramSetup['sessionMinutes']>[] = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];
const CYCLE_MODES: Option<CycleMode>[] = (['adapted', 'general'] as const).map(value => ({
  value,
  label: CYCLE_MODE_LABELS[value],
}));
const DAILY_STEPS: Option<number>[] = [4000, 5000, 6000, 8000, 10000].map(value => ({
  value,
  label: value.toLocaleString('en-US'),
}));
const LANGUAGES: Option<ProgramLanguage>[] = [
  { value: 'en', label: 'English' },
  { value: 'ro', label: 'Romanian' },
];
const GOALS: Option<string>[] = findOnboardingField('primaryGoal')?.options ?? [];
const EQUIPMENT_CHIPS: string[] = (findOnboardingField('availableEquipment')?.options ?? []).map(option => option.value);
const BODYWEIGHT_ONLY = 'Bodyweight only';
const SPLIT_SHAPES = Object.keys(SPLIT_TEMPLATES) as SplitShape[];

function toggledChips(chips: readonly string[], chip: string, checked: boolean): string[] {
  if (!checked) return chips.filter(other => other !== chip);
  if (chip === BODYWEIGHT_ONLY) return [chip];
  const next = new Set([...chips.filter(other => other !== BODYWEIGHT_ONLY), chip]);
  return EQUIPMENT_CHIPS.filter(option => next.has(option));
}

export function ProgramSetupSheet({ journey, onCreated }: { journey: ClientJourney; onCreated: () => void }) {
  const { createProgram } = usePrograms();
  const [setup, setSetup] = useState<ProgramSetup>(() => setupFromJourney(journey));
  const [chips, setChips] = useState<string[]>(() => equipmentChipsOf(journey));
  const ids = {
    goal: useId(),
    level: useId(),
    split: useId(),
    days: useId(),
    minutes: useId(),
    equipment: useId(),
    cycle: useId(),
    steps: useId(),
    language: useId(),
  };

  function set<Key extends keyof ProgramSetup>(key: Key, value: ProgramSetup[Key]) {
    setSetup(current => ({ ...current, [key]: value }));
  }

  function changeTrainingDays(trainingDays: ProgramSetup['trainingDays']) {
    setSetup(current => ({ ...current, trainingDays, splitShape: splitShapeFor(trainingDays) }));
  }

  function create() {
    createProgram(journey.callId, { ...setup, equipment: equipmentForChips(chips) });
    onCreated();
  }

  return (
    <SettingsSection
      headingId="program-setup-heading"
      title="Set up the program"
      className="mx-auto w-full max-w-xl"
      footer={
        <>
          <Link to={clientDetailPathForJourney(journey)} className={buttonVariants({ variant: 'outline' })}>
            Cancel
          </Link>
          <Button type="button" onClick={create}>
            Continue to plan
          </Button>
        </>
      }
    >
      <SettingsRows>
        <SettingsRow htmlFor={ids.goal} title="Goal" layout="stacked">
          <OptionSelect id={ids.goal} size="md" options={GOALS} value={setup.goal} onChange={value => set('goal', value)} />
        </SettingsRow>
        <SettingsRow htmlFor={ids.level} title="Level" layout="stacked">
          <OptionSelect id={ids.level} size="md" options={LEVELS} value={setup.level} onChange={value => set('level', value)} />
        </SettingsRow>
        <SettingsRow labelId={ids.split} title="Split" layout="stacked">
          <ChoiceGroup
            size="md"
            aria-labelledby={ids.split}
            value={setup.splitShape}
            onValueChange={value => set('splitShape', value as SplitShape)}
          >
            {SPLIT_SHAPES.map(shape => (
              <ChoiceOption
                key={shape}
                value={shape}
                className="h-auto min-w-0 basis-0 flex-col items-start justify-start gap-0.5 whitespace-normal px-3 py-2.5 text-left group-data-[size=md]/choice:h-auto"
              >
                <span>{SPLIT_TEMPLATES[shape].label}</span>
                <span className="text-xs font-normal opacity-80">{SPLIT_TEMPLATES[shape].description}</span>
              </ChoiceOption>
            ))}
          </ChoiceGroup>
        </SettingsRow>
        <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:px-6">
          <div className="grid gap-3">
            <Label htmlFor={ids.days}>Training days</Label>
            <OptionSelect id={ids.days} size="md" options={TRAINING_DAYS} value={setup.trainingDays} onChange={changeTrainingDays} />
          </div>
          <div className="grid gap-3">
            <Label htmlFor={ids.minutes}>Session length</Label>
            <OptionSelect
              id={ids.minutes}
              size="md"
              options={SESSION_MINUTES}
              value={setup.sessionMinutes}
              onChange={value => set('sessionMinutes', value)}
            />
          </div>
        </div>
        <SettingsRow as="fieldset" labelId={ids.equipment} title="Equipment" layout="stacked">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_CHIPS.map(chip => (
              <CheckboxChip
                key={chip}
                size="compact"
                aria-label={chip}
                checked={chips.includes(chip)}
                onCheckedChange={checked => setChips(current => toggledChips(current, chip, checked))}
              >
                {chip}
              </CheckboxChip>
            ))}
          </div>
        </SettingsRow>
        {journey.identity.gender !== 'male' && (
          <SettingsRow htmlFor={ids.cycle} title="Cycle mode" layout="stacked">
            <OptionSelect id={ids.cycle} size="md" options={CYCLE_MODES} value={setup.cycleMode} onChange={value => set('cycleMode', value)} />
          </SettingsRow>
        )}
        <SettingsRow htmlFor={ids.steps} title="Daily steps" layout="stacked">
          <OptionSelect id={ids.steps} size="md" options={DAILY_STEPS} value={setup.dailySteps} onChange={value => set('dailySteps', value)} />
        </SettingsRow>
        <SettingsRow htmlFor={ids.language} title="Program language" layout="stacked">
          <OptionSelect id={ids.language} size="md" options={LANGUAGES} value={setup.language} onChange={value => set('language', value)} />
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}

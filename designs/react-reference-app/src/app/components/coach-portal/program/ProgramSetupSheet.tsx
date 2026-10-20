import { useId, useState } from 'react';
import { Link } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import { CYCLE_MODE_LABELS, type CycleMode } from '../../../domain/cycleMode';
import type { ClientJourney } from '../../../domain/journey';
import type { LevelHint, ProgramLanguage } from '../../../domain/program';
import { setupFromJourney, type ProgramSetup } from '../../../domain/programOnboarding';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { SettingsBody, SettingsRow, SettingsRows, SettingsSection } from '../../SettingsSection';
import { Button, buttonVariants } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

type Option<Value extends string | number> = { value: Value; label: string };

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

function text(answer: unknown): string | null {
  return typeof answer === 'string' && answer ? answer : null;
}

function equipmentAndPlace(journey: ClientJourney): string {
  const answers = journey.onboarding.answers['goal-availability'];
  const equipment = Array.isArray(answers.availableEquipment) ? answers.availableEquipment.join(', ') : '';
  const place = text(answers.trainingPlace) ?? '';
  return [equipment, place].filter(Boolean).join(' · ') || 'Not answered';
}

function OptionSelect<Value extends string | number>({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: Option<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={next => onChange(options.find(option => String(option.value) === next)!.value)}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProgramSetupSheet({ journey, onCreated }: { journey: ClientJourney; onCreated: () => void }) {
  const { createProgram } = usePrograms();
  const [setup, setSetup] = useState<ProgramSetup>(() => setupFromJourney(journey));
  const ids = { goal: useId(), level: useId(), days: useId(), minutes: useId(), cycle: useId(), steps: useId(), language: useId() };
  const experience = text(journey.onboarding.answers['goal-availability'].experienceLevel);

  function set<Key extends keyof ProgramSetup>(key: Key, value: ProgramSetup[Key]) {
    setSetup(current => ({ ...current, [key]: value }));
  }

  function create() {
    createProgram(journey.callId, setup);
    onCreated();
  }

  return (
    <SettingsSection
      headingId="program-setup-heading"
      title="Set up the program"
      description="Taken from her onboarding. Change what you learned on the call."
      className="mx-auto w-full max-w-md"
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
          <Input id={ids.goal} value={setup.goal} onChange={event => set('goal', event.target.value)} />
        </SettingsRow>
        <SettingsRow
          htmlFor={ids.level}
          title="Level"
          layout="stacked"
          hint={experience && `Suggested from “${experience}”`}
        >
          <OptionSelect id={ids.level} options={LEVELS} value={setup.level} onChange={value => set('level', value)} />
        </SettingsRow>
        <SettingsRow htmlFor={ids.days} title="Training days" layout="stacked">
          <OptionSelect id={ids.days} options={TRAINING_DAYS} value={setup.trainingDays} onChange={value => set('trainingDays', value)} />
        </SettingsRow>
        <SettingsRow htmlFor={ids.minutes} title="Session length" layout="stacked">
          <OptionSelect id={ids.minutes} options={SESSION_MINUTES} value={setup.sessionMinutes} onChange={value => set('sessionMinutes', value)} />
        </SettingsRow>
        <SettingsRow title="Equipment and place" layout="stacked">
          <p className="text-sm text-text-secondary">{equipmentAndPlace(journey)}</p>
        </SettingsRow>
        {journey.identity.gender !== 'male' && (
          <SettingsRow htmlFor={ids.cycle} title="Cycle mode" layout="stacked">
            <OptionSelect id={ids.cycle} options={CYCLE_MODES} value={setup.cycleMode} onChange={value => set('cycleMode', value)} />
          </SettingsRow>
        )}
        <SettingsRow htmlFor={ids.steps} title="Daily steps" layout="stacked">
          <OptionSelect id={ids.steps} options={DAILY_STEPS} value={setup.dailySteps} onChange={value => set('dailySteps', value)} />
        </SettingsRow>
        <SettingsRow htmlFor={ids.language} title="Program language" layout="stacked">
          <OptionSelect id={ids.language} options={LANGUAGES} value={setup.language} onChange={value => set('language', value)} />
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}

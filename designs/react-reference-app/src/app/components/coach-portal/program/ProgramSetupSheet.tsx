import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import { CYCLE_MODE_LABELS, type CycleMode } from '../../../domain/cycleMode';
import type { ClientJourney } from '../../../domain/journey';
import { findOnboardingField, type OnboardingField, type OnboardingOption } from '../../../domain/onboardingSchema';
import type { LevelHint, ProgramLanguage, SplitShape } from '../../../domain/program';
import { equipmentChipsOf, equipmentForChips, setupFromJourney, type ProgramSetup } from '../../../domain/programOnboarding';
import { splitShapeFor } from '../../../domain/programSuggestions';
import { SPLIT_TEMPLATES } from '../../../domain/splitTemplates';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { OnboardingFieldControl } from '../../client-portal/onboarding/OnboardingFieldControl';
import type { OnboardingValues } from '../../client-portal/onboarding/onboardingValues';
import { SettingsSection } from '../../SettingsSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { Button, buttonVariants } from '../../ui/button';
import { Form } from '../../ui/form';

type SetupPanel = { name: string; fields: OnboardingField[] };

const LEVEL_LABELS: Record<LevelHint, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const LANGUAGE_LABELS: Record<ProgramLanguage, string> = { en: 'English', ro: 'Romanian' };
const TRAINING_DAY_LABELS: Record<ProgramSetup['trainingDays'], string> = { 2: '2 days', 3: '3 days', 4: '4 days', 5: '5+ days' };
const SESSION_MINUTE_LABELS: Record<ProgramSetup['sessionMinutes'], string> = { 30: '30 min', 45: '45 min', 60: '60 min' };
const DAILY_STEPS = [4000, 5000, 6000, 8000, 10000];
const BODYWEIGHT_ONLY = 'Bodyweight only';
const FIRST_PANEL = 'Program';

function optionsOf(labels: Record<string, string>): OnboardingOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

function field(id: keyof ProgramSetup | 'equipmentChips', label: string, kind: 'select' | 'radio' | 'chips', options: OnboardingOption[]): OnboardingField {
  return { id, label, kind, requirement: 'optional', options };
}

function splitOptions(): OnboardingOption[] {
  return (Object.keys(SPLIT_TEMPLATES) as SplitShape[]).map(shape => ({ value: shape, label: SPLIT_TEMPLATES[shape].label }));
}

function panelsFor(journey: ClientJourney): SetupPanel[] {
  const goal = findOnboardingField('primaryGoal')?.options ?? [];
  const equipment = findOnboardingField('availableEquipment')?.options ?? [];
  const steps = DAILY_STEPS.map(value => ({ value: String(value), label: value.toLocaleString('en-US') }));
  const cycleMode = journey.identity.gender === 'male' ? [] : [field('cycleMode', 'Cycle mode', 'select', optionsOf(CYCLE_MODE_LABELS))];
  return [
    {
      name: FIRST_PANEL,
      fields: [field('goal', 'Goal', 'select', goal), field('level', 'Level', 'select', optionsOf(LEVEL_LABELS)), field('language', 'Program language', 'select', optionsOf(LANGUAGE_LABELS))],
    },
    {
      name: 'Schedule',
      fields: [
        field('splitShape', 'Split', 'radio', splitOptions()),
        field('trainingDays', 'Training days', 'radio', optionsOf(TRAINING_DAY_LABELS)),
        field('sessionMinutes', 'Session length', 'radio', optionsOf(SESSION_MINUTE_LABELS)),
      ],
    },
    { name: 'Equipment', fields: [{ ...field('equipmentChips', 'Equipment', 'chips', equipment), exclusiveOptions: [BODYWEIGHT_ONLY] }] },
    { name: 'Cycle', fields: [...cycleMode, field('dailySteps', 'Daily steps', 'select', steps)] },
  ];
}

function valuesFrom(setup: ProgramSetup, chips: string[]): OnboardingValues {
  return {
    goal: setup.goal,
    level: setup.level,
    language: setup.language,
    splitShape: setup.splitShape,
    trainingDays: String(setup.trainingDays),
    sessionMinutes: String(setup.sessionMinutes),
    equipmentChips: chips,
    cycleMode: setup.cycleMode,
    dailySteps: String(setup.dailySteps),
  };
}

function text(values: OnboardingValues, key: string): string {
  const value = values[key];
  return typeof value === 'string' ? value : '';
}

function setupFrom(values: OnboardingValues): ProgramSetup {
  const chips = Array.isArray(values.equipmentChips) ? values.equipmentChips : [];
  return {
    goal: text(values, 'goal'),
    level: text(values, 'level') as LevelHint,
    language: text(values, 'language') as ProgramLanguage,
    splitShape: text(values, 'splitShape') as SplitShape,
    trainingDays: Number(text(values, 'trainingDays')) as ProgramSetup['trainingDays'],
    sessionMinutes: Number(text(values, 'sessionMinutes')) as ProgramSetup['sessionMinutes'],
    cycleMode: text(values, 'cycleMode') as CycleMode,
    dailySteps: Number(text(values, 'dailySteps')),
    equipment: equipmentForChips(chips),
  };
}

export function ProgramSetupSheet({ journey, onCreated }: { journey: ClientJourney; onCreated: () => void }) {
  const { createProgram } = usePrograms();
  const form = useForm<OnboardingValues>({ defaultValues: valuesFrom(setupFromJourney(journey), equipmentChipsOf(journey)) });

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (name !== 'trainingDays') return;
      form.setValue('splitShape', splitShapeFor(Number(values.trainingDays)));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  function create() {
    createProgram(journey.callId, setupFrom(form.getValues()));
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
      <Form {...form}>
        <Accordion type="multiple" defaultValue={[FIRST_PANEL]}>
          {panelsFor(journey).map(panel => (
            <AccordionItem key={panel.name} value={panel.name} className="px-5 sm:px-6">
              <AccordionTrigger headingTag="h3" className="text-base">
                {panel.name}
              </AccordionTrigger>
              <AccordionContent className="grid gap-6 pt-1 pb-6">
                {panel.fields.map(definition => (
                  <OnboardingFieldControl key={definition.id} control={form.control} field={definition} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Form>
    </SettingsSection>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import { usePrograms } from '../../../context/ProgramContext';
import { CYCLE_MODE_LABELS, type CycleMode } from '../../../domain/cycleMode';
import type { ClientJourney } from '../../../domain/journey';
import { findOnboardingField, type OnboardingField, type OnboardingOption } from '../../../domain/onboardingSchema';
import type { LevelHint, ProgramLanguage, SplitShape } from '../../../domain/program';
import {
  clientEquipmentOf,
  CLIENT_LEVEL_LABELS,
  SESSION_MINUTE_LABELS,
  TRAINING_DAY_LABELS,
  type ClientEquipment,
} from '../../../domain/clientProfile';
import { setupFromJourney, type ProgramSetup } from '../../../domain/programOnboarding';
import { splitShapeFor } from '../../../domain/programSuggestions';
import { SPLIT_TEMPLATES } from '../../../domain/splitTemplates';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { OnboardingFieldControl } from '../../client-portal/onboarding/OnboardingFieldControl';
import { asList, type OnboardingValues } from '../../client-portal/onboarding/onboardingValues';
import { UNSAVED_MESSAGE } from '../../client-profile/ProfileFormSection';
import { PROFILE_FIELDS } from '../../client-profile/profileFields';
import { SettingsSection } from '../../SettingsSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { Button, buttonVariants } from '../../ui/button';
import { Form } from '../../ui/form';

type SetupPanel = { name: string; fields: OnboardingField[] };

const LANGUAGE_LABELS: Record<ProgramLanguage, string> = { en: 'English', ro: 'Romanian' };
const DAILY_STEPS = [4000, 5000, 6000, 8000, 10000];
const FIRST_PANEL = 'Program';

function optionsOf(labels: Record<string, string>): OnboardingOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

type SetupFieldSpec = { id: keyof ProgramSetup; label: string; kind: 'select' | 'radio'; options: OnboardingOption[] };

function field({ id, label, kind, options }: SetupFieldSpec): OnboardingField {
  return { id, label, kind, requirement: 'optional', options };
}

function splitOptions(): OnboardingOption[] {
  return (Object.keys(SPLIT_TEMPLATES) as SplitShape[]).map(shape => ({ value: shape, label: SPLIT_TEMPLATES[shape].label }));
}

function panelsFor(journey: ClientJourney): SetupPanel[] {
  const goal = findOnboardingField('primaryGoal')?.options ?? [];
  const steps = DAILY_STEPS.map(value => ({ value: String(value), label: value.toLocaleString('en-US') }));
  const cyclePanels = journey.profile.identity.gender === 'male' ? [] : [{ name: 'Cycle', fields: [field({ id: 'cycleMode', label: 'Cycle mode', kind: 'select', options: optionsOf(CYCLE_MODE_LABELS) })] }];
  return [
    {
      name: FIRST_PANEL,
      fields: [field({ id: 'goal', label: 'Goal', kind: 'select', options: goal }), field({ id: 'level', label: 'Level', kind: 'select', options: optionsOf(CLIENT_LEVEL_LABELS) }), field({ id: 'language', label: 'Program language', kind: 'select', options: optionsOf(LANGUAGE_LABELS) })],
    },
    {
      name: 'Schedule',
      fields: [
        field({ id: 'splitShape', label: 'Split', kind: 'radio', options: splitOptions() }),
        field({ id: 'trainingDays', label: 'Training days', kind: 'radio', options: optionsOf(TRAINING_DAY_LABELS) }),
        field({ id: 'sessionMinutes', label: 'Session length', kind: 'radio', options: optionsOf(SESSION_MINUTE_LABELS) }),
        field({ id: 'dailySteps', label: 'Daily steps', kind: 'select', options: steps }),
      ],
    },
    { name: 'Equipment', fields: [{ ...PROFILE_FIELDS.equipment, requirement: 'optional' }] },
    ...cyclePanels,
  ];
}

function valuesFrom(setup: ProgramSetup, clientEquipment: readonly ClientEquipment[]): OnboardingValues {
  return {
    goal: setup.goal,
    level: setup.level,
    language: setup.language,
    splitShape: setup.splitShape,
    trainingDays: String(setup.trainingDays),
    sessionMinutes: String(setup.sessionMinutes),
    equipment: [...clientEquipment],
    cycleMode: setup.cycleMode,
    dailySteps: String(setup.dailySteps),
  };
}

function text(values: OnboardingValues, key: string): string {
  const value = values[key];
  return typeof value === 'string' ? value : '';
}

function setupFrom(values: OnboardingValues): ProgramSetup {
  return {
    goal: text(values, 'goal'),
    level: text(values, 'level') as LevelHint,
    language: text(values, 'language') as ProgramLanguage,
    splitShape: text(values, 'splitShape') as SplitShape,
    trainingDays: Number(text(values, 'trainingDays')) as ProgramSetup['trainingDays'],
    sessionMinutes: Number(text(values, 'sessionMinutes')) as ProgramSetup['sessionMinutes'],
    cycleMode: text(values, 'cycleMode') as CycleMode,
    dailySteps: Number(text(values, 'dailySteps')),
  };
}

function sameEquipment(chosen: readonly ClientEquipment[], current: readonly ClientEquipment[]): boolean {
  return chosen.length === current.length && chosen.every(item => current.includes(item));
}

export function ProgramSetupSheet({ journey, onCreated }: { journey: ClientJourney; onCreated: () => void }) {
  const { createProgram } = usePrograms();
  const { updateClientProfile } = useClientJourneys();
  const currentEquipment = journey.profile.coaching?.equipment ?? [];
  const form = useForm<OnboardingValues>({
    defaultValues: valuesFrom(setupFromJourney(journey), currentEquipment),
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (name !== 'trainingDays') return;
      form.setValue('splitShape', splitShapeFor(Number(values.trainingDays)));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const create = form.handleSubmit(async values => {
    const equipment = clientEquipmentOf(asList(values.equipment));
    try {
      if (!sameEquipment(equipment, currentEquipment)) await updateClientProfile(journey.callId, { coaching: { equipment } });
    } catch {
      toast.error(UNSAVED_MESSAGE);
      return;
    }
    createProgram(journey.callId, setupFrom(values));
    onCreated();
  });

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
          <Button type="button" onClick={create} disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
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

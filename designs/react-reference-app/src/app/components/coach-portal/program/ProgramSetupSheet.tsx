import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useAppState } from '../../../context/AppContext';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import { usePrograms } from '../../../context/ProgramContext';
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
import { DAILY_STEP_TARGETS } from '../../../domain/programDefaults';
import { setupFromJourney, type ProgramSetup } from '../../../domain/programOnboarding';
import { splitShapeFor } from '../../../domain/programSuggestions';
import { SPLIT_TEMPLATES } from '../../../domain/splitTemplates';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { writeProgramThroughServer } from '../../../services/programWriteService';
import { clientDetailPathForJourney, clientPronouns, journeyClientName } from '../../../utils/journeyLabels';
import { possessive } from '../../../utils/resourceLabels';
import { OnboardingFieldControl } from '../../client-portal/onboarding/OnboardingFieldControl';
import { asList, type OnboardingValues } from '../../client-portal/onboarding/onboardingValues';
import { PROFILE_FIELDS } from '../../client-profile/profileFields';
import { PortalPageHeader } from '../../PortalPageHeader';
import { PORTAL_PAGE_TITLE_CLASS } from '../../typography';
import { SettingsSection } from '../../SettingsSection';
import { Alert } from '../../ui/alert';
import { Button, buttonVariants } from '../../ui/button';
import { cardVariants } from '../../ui/card';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Form } from '../../ui/form';
import { Skeleton } from '../../ui/skeleton';
import { cn } from '../../ui/utils';

const LANGUAGE_LABELS: Record<ProgramLanguage, string> = { en: 'English', ro: 'Romanian' };
const NOT_CREATED_MESSAGE = 'The program wasn’t created. Your choices are still here, so try again.';
const SKELETON_FIELDS = 8;

const COACH_GOAL_LABELS: Record<string, string> = {
  'Lose fat': 'Fat loss',
  'Build muscle': 'Muscle gain',
  'Maintain a healthy weight': 'Weight maintenance',
  'Learn to balance activity and nutrition': 'Activity and nutrition balance',
  'Improve overall health': 'Overall health',
  'Work with my menstrual cycle': 'Cycle-aware training',
};

function optionsOf(labels: Record<string, string>): OnboardingOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

function goalOptions(): OnboardingOption[] {
  return (findOnboardingField('primaryGoal')?.options ?? []).map(option => ({ value: option.value, label: COACH_GOAL_LABELS[option.value] ?? option.label }));
}

function splitOptions(): OnboardingOption[] {
  return (Object.keys(SPLIT_TEMPLATES) as SplitShape[]).map(shape => ({ value: shape, label: SPLIT_TEMPLATES[shape].label }));
}

function stepOptions(): OnboardingOption[] {
  return DAILY_STEP_TARGETS.map(value => ({ value: String(value), label: value.toLocaleString('en-US') }));
}

type SetupFieldSpec = Pick<OnboardingField, 'label' | 'kind' | 'options'> & { id: keyof ProgramSetup };

function choice({ id, label, kind, options }: SetupFieldSpec): OnboardingField {
  return { id, label, kind, requirement: 'optional', options };
}

function setupFields(): OnboardingField[] {
  return [
    { id: 'goal', label: 'Goal', kind: 'select', requirement: 'required', requiredMessage: 'Choose a goal.', options: goalOptions() },
    choice({ id: 'level', label: 'Level', kind: 'select', options: optionsOf(CLIENT_LEVEL_LABELS) }),
    choice({ id: 'trainingDays', label: 'Training days', kind: 'radio', options: optionsOf(TRAINING_DAY_LABELS) }),
    choice({ id: 'splitShape', label: 'Split', kind: 'radio', options: splitOptions() }),
    choice({ id: 'sessionMinutes', label: 'Session length', kind: 'radio', options: optionsOf(SESSION_MINUTE_LABELS) }),
    choice({ id: 'dailySteps', label: 'Daily steps', kind: 'select', options: stepOptions() }),
    { ...PROFILE_FIELDS.equipment, requiredMessage: 'Choose at least one equipment option.' },
    choice({ id: 'language', label: 'Program language', kind: 'select', options: optionsOf(LANGUAGE_LABELS) }),
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
    dailySteps: Number(text(values, 'dailySteps')),
  };
}

function sameEquipment(chosen: readonly ClientEquipment[], current: readonly ClientEquipment[]): boolean {
  return chosen.length === current.length && chosen.every(item => current.includes(item));
}

function setupTitle(journey: ClientJourney): string {
  return `Build ${possessive(journey.profile.identity.firstName)} program`;
}

type SetupFrameProps = { journey: ClientJourney; title: string; onLeave?: (event: MouseEvent<HTMLAnchorElement>) => void; children: ReactNode };

function SetupFrame({ journey, title, onLeave, children }: SetupFrameProps) {
  useDocumentTitle(title);
  return (
    <div className="mx-auto w-full max-w-xl">
      <nav aria-label="Back to the client" className="mb-4">
        <Link
          to={clientDetailPathForJourney(journey)}
          onClick={onLeave}
          className="relative hit-area inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          {journeyClientName(journey)}
        </Link>
      </nav>
      {children}
    </div>
  );
}

const NOT_READY_TITLE = 'Program not ready yet';

export function ProgramSetupNotReady({ journey }: { journey: ClientJourney }) {
  const her = clientPronouns(journey.profile.identity.gender).possessive.lower;
  return (
    <SetupFrame journey={journey} title={NOT_READY_TITLE}>
      <div className={cn(cardVariants({ variant: 'panel' }), 'flex flex-col items-center px-6 py-12 text-center sm:px-10')}>
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-surface-subtle text-text-secondary">
          <ClipboardList size={28} />
        </span>
        <h1 className={cn(PORTAL_PAGE_TITLE_CLASS, 'mt-6')}>{NOT_READY_TITLE}</h1>
        <p className="mt-2 text-base text-text-secondary">{`The program opens once ${her} answers are approved.`}</p>
      </div>
    </SetupFrame>
  );
}

export function ProgramSetupSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <p role="status" className="sr-only">
        Loading the program setup
      </p>
      <Skeleton className="mb-5 h-5 w-40" />
      <Skeleton className="mb-8 h-10 w-72 max-w-full" />
      <div aria-hidden="true" className="grid gap-6 rounded-panel border border-border-subtle bg-surface-base px-5 py-6 sm:px-6">
        {Array.from({ length: SKELETON_FIELDS }, (_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function useSplitFollowingDays(form: UseFormReturn<OnboardingValues>) {
  const splitChosen = useRef(false);
  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      if (name === 'splitShape' && type === 'change') splitChosen.current = true;
      if (name !== 'trainingDays' || splitChosen.current) return;
      form.setValue('splitShape', splitShapeFor(Number(values.trainingDays)));
    });
    return () => subscription.unsubscribe();
  }, [form]);
}

export function ProgramSetupSheet({ journey, onCreated }: { journey: ClientJourney; onCreated: () => void }) {
  const { createProgram } = usePrograms();
  const { updateClientProfile } = useClientJourneys();
  const { appState } = useAppState();
  const navigate = useNavigate();
  const currentEquipment = journey.profile.coaching?.equipment ?? [];
  const form = useForm<OnboardingValues>({
    defaultValues: valuesFrom(setupFromJourney(journey), currentEquipment),
  });
  const { isSubmitting, isDirty } = form.formState;
  const headingId = useId();
  const [failed, setFailed] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const clientPath = clientDetailPathForJourney(journey);
  useSplitFollowingDays(form);

  const create = form.handleSubmit(async values => {
    const equipment = clientEquipmentOf(asList(values.equipment));
    setFailed(false);
    try {
      await writeProgramThroughServer(appState.programWrite, async () => {
        if (!sameEquipment(equipment, currentEquipment)) await updateClientProfile(journey.callId, { coaching: { equipment } });
        createProgram(journey.callId, setupFrom(values));
      });
    } catch {
      setFailed(true);
      return;
    }
    onCreated();
  });

  function cancel(event: MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    event.preventDefault();
    setConfirmingLeave(true);
  }

  return (
    <SetupFrame journey={journey} title={setupTitle(journey)} onLeave={cancel}>
      <PortalPageHeader headingId={headingId} title={setupTitle(journey)} />
      <Form {...form}>
        <form noValidate onSubmit={create}>
          <SettingsSection
            headingId={headingId}
            footer={
              <>
                <Link to={clientPath} onClick={cancel} className={buttonVariants({ variant: 'outline', size: 'md' })}>
                  Cancel
                </Link>
                <Button type="submit" size="md" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
                  {isSubmitting ? 'Creating…' : 'Create program'}
                </Button>
              </>
            }
          >
            <div className="grid gap-6 px-5 py-6 sm:px-6">
              {setupFields().map(definition => (
                <OnboardingFieldControl key={definition.id} control={form.control} field={definition} />
              ))}
              {failed && <Alert>{NOT_CREATED_MESSAGE}</Alert>}
            </div>
          </SettingsSection>
        </form>
      </Form>
      <ConfirmDialog
        open={confirmingLeave}
        onOpenChange={setConfirmingLeave}
        title="Unsaved changes"
        description="Leave without creating the program? The choices you made here are lost."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        tone="destructive"
        onConfirm={() => navigate(clientPath)}
      />
    </SetupFrame>
  );
}

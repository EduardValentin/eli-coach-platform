import { Fragment, useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { ClipboardList } from 'lucide-react';
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
import { equipmentChangeLines, type EquipmentChangeLine } from '../../../domain/equipmentChange';
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
import { DeadEndPanel } from '../../ErrorPage';
import { PortalBackLink } from '../../PortalBackLink';
import { PortalPageHeader } from '../../PortalPageHeader';
import { SettingsSection } from '../../SettingsSection';
import { Alert } from '../../ui/alert';
import { Button, buttonVariants } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Form } from '../../ui/form';
import { Skeleton } from '../../ui/skeleton';

const LANGUAGE_LABELS: Record<ProgramLanguage, string> = { en: 'English', ro: 'Romanian' };
const NOT_CREATED_MESSAGE = 'The program wasn’t created. Your choices are still here, so try again.';
const SAVING_MESSAGE = 'Creating the program…';
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

function ProfileChangeDescription({ pronoun, lines }: { pronoun: string; lines: EquipmentChangeLine[] }) {
  return (
    <>
      Creating the program saves the equipment you chose here to {pronoun} profile.
      {lines.map(({ label, names }, index) => (
        <Fragment key={label}>
          {' '}
          <span className={index === 0 ? 'mt-3 block' : 'mt-1 block'}>
            <span className="font-medium">{label}:</span> <span className="text-text-primary">{names.join(', ')}.</span>
          </span>
        </Fragment>
      ))}
    </>
  );
}

function setupTitle(journey: ClientJourney): string {
  return `Build ${possessive(journey.profile.identity.firstName)} program`;
}

type SetupParityRoot = 'ProgramSetupSheet' | 'ProgramSetupNotReady';

type SetupFrameProps = { journey: ClientJourney; title: string; parityRoot: SetupParityRoot; onLeave?: (event: MouseEvent<HTMLAnchorElement>) => void; children: ReactNode };

function SetupFrame({ journey, title, parityRoot, onLeave, children }: SetupFrameProps) {
  useDocumentTitle(title);
  return (
    <div className="mx-auto w-full max-w-xl" data-parity-root={parityRoot}>
      <PortalBackLink to={clientDetailPathForJourney(journey)} onClick={onLeave} navigationLabel="Back to the client">
        Back to {journeyClientName(journey)}
      </PortalBackLink>
      {children}
    </div>
  );
}

const NOT_READY_TITLE = 'Program not ready yet';

export function ProgramSetupNotReady({ journey }: { journey: ClientJourney }) {
  const her = clientPronouns(journey.profile.identity.gender).possessive.lower;
  return (
    <SetupFrame journey={journey} title={NOT_READY_TITLE} parityRoot="ProgramSetupNotReady">
      <DeadEndPanel
        icon={ClipboardList}
        title={NOT_READY_TITLE}
        description={`The program opens once ${her} answers are approved.`}
        announcement="none"
      />
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
  const [confirmingProfileChange, setConfirmingProfileChange] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const clientPath = clientDetailPathForJourney(journey);
  useSplitFollowingDays(form);

  const profileChange = equipmentChangeLines(currentEquipment, clientEquipmentOf(asList(form.watch('equipment'))));

  const save = form.handleSubmit(async values => {
    const equipment = clientEquipmentOf(asList(values.equipment));
    setFailed(false);
    try {
      await writeProgramThroughServer(appState.programWrite, async () => {
        if (equipmentChangeLines(currentEquipment, equipment).length > 0) await updateClientProfile(journey.callId, { coaching: { equipment } });
        createProgram(journey.callId, setupFrom(values));
      });
    } catch {
      setFailed(true);
      return;
    }
    onCreated();
  });

  const create = form.handleSubmit(async () => {
    if (profileChange.length === 0) return save();
    setConfirmingProfileChange(true);
  });

  function confirmProfileChange() {
    setConfirmingProfileChange(false);
    void save();
  }

  function cancel(event: MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    event.preventDefault();
    setConfirmingLeave(true);
  }

  return (
    <SetupFrame journey={journey} title={setupTitle(journey)} parityRoot="ProgramSetupSheet" onLeave={cancel}>
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
                <Button ref={createButton} type="submit" size="md" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
                  {isSubmitting ? 'Creating…' : 'Create program'}
                </Button>
              </>
            }
          >
            <div className="grid gap-6 px-5 py-6 sm:px-6" data-parity="setup-fields">
              {setupFields().map(definition => (
                <OnboardingFieldControl key={definition.id} control={form.control} field={definition} />
              ))}
              {failed && <Alert>{NOT_CREATED_MESSAGE}</Alert>}
            </div>
          </SettingsSection>
          <p role="status" className="sr-only" data-parity="saving-status">
            {isSubmitting ? SAVING_MESSAGE : ''}
          </p>
        </form>
      </Form>
      <ConfirmDialog
        open={confirmingProfileChange}
        onOpenChange={setConfirmingProfileChange}
        title={`This updates ${possessive(journey.profile.identity.firstName)} profile`}
        description={<ProfileChangeDescription pronoun={clientPronouns(journey.profile.identity.gender).possessive.lower} lines={profileChange} />}
        cancelLabel="Keep editing"
        confirmLabel="Create program"
        onConfirm={confirmProfileChange}
        returnFocusTo={createButton}
      />
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

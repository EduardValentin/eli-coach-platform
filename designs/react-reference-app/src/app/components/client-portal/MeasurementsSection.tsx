import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { Ruler } from 'lucide-react';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  measurementAnswersFrom,
  measurementEntryFrom,
} from '../../domain/measurements';
import {
  measurementCadenceHint,
  measurementDueDates,
} from '../../domain/measurementSchedule';
import type { MeasurementEntry } from '../../domain/journey';
import { MEASUREMENT_FIELDS } from '../../domain/onboardingSchema';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { formatBodyWeight, formatCircumference } from '../../utils/units';
import { Button } from '../ui/button';
import { Form } from '../ui/form';
import { ResponsiveSheetDialog } from '../workout/ResponsiveSheetDialog';
import { OnboardingFieldControl } from './onboarding/OnboardingFieldControl';
import {
  EMPTY_PROGRESS_PHOTOS,
  ProgressPhotoBlock,
  type ProgressPhotos,
} from './onboarding/ProgressPhotoBlock';
import {
  toAnswers,
  toFormValues,
  type OnboardingValues,
} from './onboarding/onboardingValues';
import { useMeasureUnits, type MeasureUnits } from './measureUnits';

const PANEL_CLASS =
  'rounded-panel border border-neutral-100/50 bg-white p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] lg:p-8';

const SHEET_TITLE = 'Add measurements';

const SHEET_DESCRIPTION =
  'Same time of day, same tape, same spots — that is what keeps them comparable.';

function readingsOf(entry: MeasurementEntry, units: MeasureUnits): string {
  const circumferences: [string, number | undefined][] = [
    ['Waist', entry.waistCm],
    ['Hips', entry.hipsCm],
    ['Thigh', entry.thighCm],
    ['Arm', entry.armCm],
  ];

  return [
    `Weight ${formatBodyWeight(entry.weightKg, units.weight)}`,
    ...circumferences
      .filter(([, value]) => value !== undefined)
      .map(
        ([name, value]) =>
          `${name} ${formatCircumference(value ?? 0, units.length)}`,
      ),
  ].join(' · ');
}

function AddMeasurementsForm({
  latest,
  onClose,
}: {
  latest: MeasurementEntry | undefined;
  onClose: () => void;
}) {
  const units = useMeasureUnits();
  const { demoJourney, addMeasurements } = useClientJourneys();
  const [photos, setPhotos] = useState<ProgressPhotos>(EMPTY_PROGRESS_PHOTOS);
  const [photoConsent, setPhotoConsent] = useState(false);
  const form = useForm<OnboardingValues>({
    defaultValues: toFormValues(
      MEASUREMENT_FIELDS,
      measurementAnswersFrom(latest),
      units,
    ),
  });

  const save = form.handleSubmit((values) => {
    const entry = measurementEntryFrom(
      toAnswers(MEASUREMENT_FIELDS, values, units),
      new Date(),
    );
    if (!entry) return;

    addMeasurements(demoJourney.callId, entry);
    onClose();
  });

  return (
    <>
      <div className="shrink-0 border-b border-neutral-100 px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <h3 className="pr-10 text-lg font-semibold leading-snug text-text-primary md:text-xl">
          {SHEET_TITLE}
        </h3>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          {SHEET_DESCRIPTION}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
        <Form {...form}>
          <form className="grid gap-6" noValidate onSubmit={save}>
            {MEASUREMENT_FIELDS.map((field) => (
              <OnboardingFieldControl
                control={form.control}
                field={field}
                key={field.id}
              />
            ))}

            <ProgressPhotoBlock
              consented={photoConsent}
              onConsentChange={setPhotoConsent}
              onPhotosChange={setPhotos}
              photos={photos}
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full sm:w-auto"
              >
                Save measurements
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}

export function MeasurementsSection() {
  const { demoJourney } = useClientJourneys();
  const units = useMeasureUnits();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [adding, setAdding] = useState(false);

  const history = [...demoJourney.measurements].sort(
    (first, second) => second.recordedAt.getTime() - first.recordedAt.getTime(),
  );
  const latest = history[0];
  const tracksCycle =
    Object.keys(demoJourney.onboarding.answers['cycle-context']).length > 0
      ? 'yes'
      : 'no';
  const due = latest ? measurementDueDates(latest.recordedAt) : null;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="measurements-heading"
      className={`${PANEL_CLASS} mt-6 lg:mt-8`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-card bg-brand-secondary/10 text-brand-secondary">
          <Ruler size={18} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h2
          className="font-serif text-xl font-semibold text-text-primary"
          id="measurements-heading"
        >
          Measurements
        </h2>
      </div>

      <p className="text-sm text-text-secondary">
        {measurementCadenceHint(tracksCycle)}
      </p>
      {due && (
        <p className="mt-1 text-sm text-text-secondary">
          Next weight: {formatJourneyDate(due.weight)} · Next circumferences:{' '}
          {formatJourneyDate(due.circumferences)}
        </p>
      )}

      {history.length === 0 ? (
        <p className="mt-6 text-sm text-text-secondary">
          Nothing recorded yet. Your first set goes in with your answers.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-100">
          {history.map((entry) => (
            <li className="py-3" key={entry.recordedAt.toISOString()}>
              <p className="text-caption font-bold uppercase tracking-widest text-text-secondary">
                {formatJourneyDate(entry.recordedAt)}
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {readingsOf(entry, units)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Button
        className="mt-6 w-full sm:w-auto"
        onClick={() => setAdding(true)}
        variant="brand"
        size="lg"
      >
        {SHEET_TITLE}
      </Button>

      <ResponsiveSheetDialog
        description={SHEET_DESCRIPTION}
        onOpenChange={setAdding}
        open={adding}
        title={SHEET_TITLE}
      >
        <AddMeasurementsForm latest={latest} onClose={() => setAdding(false)} />
      </ResponsiveSheetDialog>
    </motion.section>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MeasurementsTable } from '../MeasurementsTable';
import { statedHeightCm } from '../../domain/bodyMetrics';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  measurementAnswersFrom,
  measurementEntryFrom,
} from '../../domain/measurements';
import type { MeasurementEntry } from '../../domain/journey';
import { MEASUREMENT_FIELDS } from '../../domain/onboardingSchema';
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

const SHEET_TITLE = 'Add measurements';

const SHEET_DESCRIPTION =
  'Same time of day, same tape, same spots — that is what keeps them comparable.';

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
                variant="default"
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
  const [adding, setAdding] = useState(false);

  const history = [...demoJourney.measurements].sort(
    (first, second) => second.recordedAt.getTime() - first.recordedAt.getTime(),
  );
  const latest = history[0];

  return (
    <MeasurementsTable
      measurements={demoJourney.measurements}
      heightCm={statedHeightCm(demoJourney.onboarding.answers)}
      units={units}
      headingId="measurements-heading"
      emptyMessage="Nothing recorded yet. Your first set goes in with your answers."
      className="mt-6 lg:mt-8"
    >
      <Button
        className="mt-6 w-full sm:w-auto"
        onClick={() => setAdding(true)}
        variant="default"
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
    </MeasurementsTable>
  );
}

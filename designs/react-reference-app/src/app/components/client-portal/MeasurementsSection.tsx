import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { MeasurementsTable } from '../MeasurementsTable';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  measurementAnswersFrom,
  measurementEntryFrom,
  progressPhotoRefusalMessage,
} from '../../domain/measurements';
import {
  NO_PROGRESS_PHOTOS,
  type MeasurementEntry,
  type ProgressPhotoSet,
} from '../../domain/journey';
import { MEASUREMENT_FIELDS } from '../../domain/onboardingSchema';
import { recordMeasurements } from '../../services/measurementService';
import { Button } from '../ui/button';
import { Form } from '../ui/form';
import { ResponsiveSheetDialog } from '../workout/ResponsiveSheetDialog';
import { OnboardingFieldControl } from './onboarding/OnboardingFieldControl';
import { ProgressPhotoBlock } from './onboarding/ProgressPhotoBlock';
import {
  toAnswers,
  toFormValues,
  type OnboardingValues,
} from './onboarding/onboardingValues';
import { useMeasureUnits } from './measureUnits';
import { PhotoViewDialog } from '../PhotoViewDialog';

const SHEET_TITLE = 'Add measurements';

const SHEET_DESCRIPTION =
  'Same time of day, same tape, same spots — that is what keeps them comparable.';

const SAVED_TOAST = 'Measurements saved.';

const SAVE_FAILED_TOAST = 'Your measurements could not be saved. Try again.';

const REMOVE_FAILED_TOAST = 'The photo could not be removed. Try again.';

function AddMeasurementsForm({
  latest,
  onClose,
}: {
  latest: MeasurementEntry | undefined;
  onClose: () => void;
}) {
  const units = useMeasureUnits();
  const { appState } = useAppState();
  const { demoJourney, addMeasurements, recordProgressPhotoConsent } =
    useClientJourneys();
  const [photos, setPhotos] = useState<ProgressPhotoSet>(NO_PROGRESS_PHOTOS);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const consentedAt = demoJourney.progressPhotosConsentedAt;
  const mayKeepPhotos = consentedAt !== null || photoConsent;
  const form = useForm<OnboardingValues>({
    defaultValues: toFormValues(
      MEASUREMENT_FIELDS,
      measurementAnswersFrom(latest),
      units,
    ),
  });

  const save = form.handleSubmit(async (values) => {
    const entry = measurementEntryFrom(
      toAnswers(MEASUREMENT_FIELDS, values, units),
      new Date(),
      mayKeepPhotos ? photos : NO_PROGRESS_PHOTOS,
    );
    if (!entry) return;

    setSaving(true);
    const recorded = await recordMeasurements(entry, {
      processing: appState.photoProcessing,
      save: appState.measurementSave,
    }).catch(() => null);
    if (!recorded) {
      setSaving(false);
      toast.error(SAVE_FAILED_TOAST);
      return;
    }
    if (photoConsent) {
      recordProgressPhotoConsent(demoJourney.callId, recorded.entry.recordedAt);
    }
    addMeasurements(demoJourney.callId, recorded.entry);
    onClose();
    toast.success(SAVED_TOAST);
    recorded.refusedViews.forEach((view) =>
      toast.error(progressPhotoRefusalMessage(view)),
    );
  });

  return (
    <>
      <div className="shrink-0 border-b border-border-subtle px-5 pt-6 pb-4 md:px-8 md:pt-8">
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
              consent={
                consentedAt
                  ? { status: 'recorded', at: consentedAt }
                  : {
                      status: 'asking',
                      ticked: photoConsent,
                      onTickedChange: setPhotoConsent,
                    }
              }
              onPhotosChange={setPhotos}
              photos={photos}
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">
              <Button
                disabled={saving}
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
              >
                Save measurements
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="md"
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
  const { demoJourney, removeMeasurementPhoto } = useClientJourneys();
  const units = useMeasureUnits();
  const [adding, setAdding] = useState(false);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);

  const history = [...demoJourney.measurements].sort(
    (first, second) => second.recordedAt.getTime() - first.recordedAt.getTime(),
  );
  const latest = history[0];
  const viewing = history.find((entry) => entry.id === viewingEntryId);

  return (
    <MeasurementsTable
      measurements={demoJourney.measurements}
      units={units}
      headingId="measurements-heading"
      emptyMessage="Nothing recorded yet. Your first set goes in with your answers."
      className="mt-6 lg:mt-8"
      perspective="client"
      onViewPhotos={(entry) => setViewingEntryId(entry.id)}
      action={
        <Button onClick={() => setAdding(true)} variant="outline" size="sm">
          <Plus aria-hidden="true" size={16} />
          Add
        </Button>
      }
      emptyAction={
        <Button onClick={() => setAdding(true)} variant="primary" size="sm">
          Add your first measurements
        </Button>
      }
    >
      <ResponsiveSheetDialog
        description={SHEET_DESCRIPTION}
        onOpenChange={setAdding}
        open={adding}
        title={SHEET_TITLE}
      >
        <AddMeasurementsForm latest={latest} onClose={() => setAdding(false)} />
      </ResponsiveSheetDialog>

      <PhotoViewDialog
        entry={viewing}
        onClose={() => setViewingEntryId(null)}
        viewer={{
          role: 'client',
          onRemovePhoto: (view) => {
            if (!viewing) return;
            removeMeasurementPhoto(demoJourney.callId, viewing.id, view).catch(
              () => toast.error(REMOVE_FAILED_TOAST),
            );
          },
        }}
      />
    </MeasurementsTable>
  );
}

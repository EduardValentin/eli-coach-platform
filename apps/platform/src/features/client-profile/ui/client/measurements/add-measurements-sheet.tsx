import { MEASUREMENT_FIELDS } from "@eli-coach-platform/domain/measurement";
import type { MeasureUnits } from "@eli-coach-platform/domain/unit-preference";
import {
  ResponsiveSheetDialog,
  SheetDialogActions,
  SheetDialogBody,
  SheetDialogHeader,
} from "@eli-coach-platform/ui/layout";
import { Button } from "@eli-coach-platform/ui/primitives";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  MEASUREMENTS_COPY,
  PHOTO_CONSENT_GIVEN,
  type MeasurementRow,
} from "~/features/client-profile/public/measurements";
import {
  measurementEntryOf,
  measurementFormValuesOf,
  type MeasurementFormValues,
} from "~/features/client-profile/ui/client/measurements/measurement-form-values";
import { useMeasurementsRecording } from "~/features/client-profile/ui/client/measurements/use-measurements-recording";
import { MeasureField } from "~/features/client-profile/ui/shared/measure-field/measure-field";
import {
  ProgressPhotoBlock,
  type ProgressPhotoConsent,
} from "~/features/client-profile/ui/shared/photos/progress-photo-block";
import {
  NO_PROGRESS_PHOTO_PICKS,
  type ProgressPhotoPicks,
} from "~/features/client-profile/ui/shared/photos/progress-photo-picks";

type AddMeasurementsStartingPoint = {
  latest: MeasurementRow | undefined;
  units: MeasureUnits;
  consentedAt: string | null;
};

type AddMeasurementsSheetProps = AddMeasurementsStartingPoint & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SHEET_COPY = MEASUREMENTS_COPY.sheet;

function AddMeasurementsForm({
  latest,
  units,
  consentedAt,
  onClose,
}: AddMeasurementsStartingPoint & { onClose: () => void }) {
  const { record, recording } = useMeasurementsRecording(onClose);
  const [photos, setPhotos] = useState<ProgressPhotoPicks>(
    NO_PROGRESS_PHOTO_PICKS,
  );
  const [consentTicked, setConsentTicked] = useState(false);
  const form = useForm<MeasurementFormValues>({
    defaultValues: measurementFormValuesOf(latest, units),
  });

  const consent: ProgressPhotoConsent = consentedAt
    ? { status: "recorded", at: consentedAt }
    : {
        status: "asking",
        ticked: consentTicked,
        onTickedChange: setConsentTicked,
      };

  const save = form.handleSubmit((values) =>
    record({
      entry: measurementEntryOf(values, units),
      photos,
      photoConsent: consentTicked ? PHOTO_CONSENT_GIVEN : null,
    }),
  );

  return (
    <>
      <SheetDialogHeader
        description={SHEET_COPY.description}
        title={SHEET_COPY.title}
      />

      <SheetDialogBody>
        <form className="grid gap-6" noValidate onSubmit={save}>
          {MEASUREMENT_FIELDS.map((field) => (
            <MeasureField
              control={form.control}
              field={field}
              key={field.id}
              name={field.id}
              units={units}
            />
          ))}

          <ProgressPhotoBlock
            consent={consent}
            onPhotosChange={setPhotos}
            photos={photos}
          />

          <SheetDialogActions>
            <Button
              disabled={recording}
              size="md"
              type="submit"
              variant="primary"
              width="full-below-sm"
            >
              {SHEET_COPY.save}
            </Button>
            <Button
              onClick={onClose}
              size="md"
              type="button"
              variant="ghost"
              width="full-below-sm"
            >
              {SHEET_COPY.cancel}
            </Button>
          </SheetDialogActions>
        </form>
      </SheetDialogBody>
    </>
  );
}

export function AddMeasurementsSheet({
  open,
  onOpenChange,
  ...startingPoint
}: AddMeasurementsSheetProps) {
  return (
    <ResponsiveSheetDialog
      description={SHEET_COPY.description}
      onOpenChange={onOpenChange}
      open={open}
      title={SHEET_COPY.title}
    >
      <AddMeasurementsForm
        {...startingPoint}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveSheetDialog>
  );
}

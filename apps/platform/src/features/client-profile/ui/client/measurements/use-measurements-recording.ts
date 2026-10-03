import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent } from "react";
import { useFetcher } from "react-router";

import {
  MEASUREMENTS_COPY,
  PHOTO_CONSENT_GIVEN,
  RECORD_MEASUREMENTS_FIELDS,
  recordMeasurementsResponseSchema,
  type MeasurementEntryRequest,
} from "~/features/client-profile/contracts/measurements";
import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/contracts/paths";
import {
  appendProgressPhotoParts,
  refusedPhotoViewsOf,
  type ProgressPhotoPicks,
} from "~/features/client-profile/ui/shared/photos/progress-photo-picks";

type MeasurementsRecord = {
  entry: MeasurementEntryRequest;
  photos: ProgressPhotoPicks;
  photoConsent: typeof PHOTO_CONSENT_GIVEN | null;
};

function measurementsFormData({
  entry,
  photos,
  photoConsent,
}: MeasurementsRecord): FormData {
  const formData = new FormData();
  formData.append(RECORD_MEASUREMENTS_FIELDS.entry, JSON.stringify(entry));

  if (photoConsent) {
    formData.append(RECORD_MEASUREMENTS_FIELDS.photoConsent, photoConsent);
  }

  appendProgressPhotoParts(formData, photos);

  return formData;
}

export function useMeasurementsRecording(onRecorded: () => void) {
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((response: unknown) => {
    const recorded = recordMeasurementsResponseSchema.safeParse(response);

    if (!recorded.success) {
      toast.error(MEASUREMENTS_COPY.toasts.failed);
      return;
    }

    onRecorded();
    toast.success(MEASUREMENTS_COPY.toasts.saved);
    refusedPhotoViewsOf(recorded.data.photos).forEach((view) =>
      toast.error(MEASUREMENTS_COPY.toasts.photoRefused(view)),
    );
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const record = (measurements: MeasurementsRecord) => {
    void submit(measurementsFormData(measurements), {
      action: CLIENT_PROFILE_API_PATHS.measurements,
      encType: "multipart/form-data",
      method: "post",
    });
  };

  return { record, recording: state !== "idle" };
}

import { joinBasePath } from "@eli-coach-platform/config";
import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";

import {
  PHOTO_CONSENT_GIVEN,
  RECORD_MEASUREMENTS_FIELDS,
  recordMeasurementsResponseSchema,
  type MeasurementEntryRequest,
} from "~/features/client-profile/contracts/measurements";
import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/contracts/paths";
import { PROGRESS_PHOTO_PARTS } from "~/features/client-profile/contracts/progress-photo-parts";
import { progressPhotoUrl } from "~/features/client-profile/ui/shared/photos/progress-photo-url";

export type ProgressPhotoPicks = Partial<Record<ProgressPhotoView, File>>;

type MeasurementsSubmission = {
  entry: MeasurementEntryRequest;
  givesPhotoConsent: boolean;
  photos: ProgressPhotoPicks;
};

type RecordMeasurementsOutcome =
  { kind: "recorded"; refusedViews: ProgressPhotoView[] } | { kind: "failed" };

type RemoveProgressPhotoOutcome = { kind: "removed" } | { kind: "failed" };

const MEASUREMENTS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  CLIENT_PROFILE_API_PATHS.measurements,
);

const RECORDED_STATUS = 201;

const REMOVED_STATUS = 204;

const RECORD_FAILED: RecordMeasurementsOutcome = { kind: "failed" };

async function fetchUnlessUnreachable(
  url: string,
  init: RequestInit,
): Promise<Response | null> {
  try {
    return await fetch(url, init);
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function pickedPhotosOf(
  photos: ProgressPhotoPicks,
): [ProgressPhotoView, File][] {
  return PROGRESS_PHOTO_VIEWS.flatMap((view) => {
    const photo = photos[view];

    return photo ? [[view, photo]] : [];
  });
}

function measurementsFormData(submission: MeasurementsSubmission): FormData {
  const formData = new FormData();
  formData.append(
    RECORD_MEASUREMENTS_FIELDS.entry,
    JSON.stringify(submission.entry),
  );

  if (submission.givesPhotoConsent) {
    formData.append(
      RECORD_MEASUREMENTS_FIELDS.photoConsent,
      PHOTO_CONSENT_GIVEN,
    );
  }

  for (const [view, photo] of pickedPhotosOf(submission.photos)) {
    formData.append(PROGRESS_PHOTO_PARTS[view], photo);
  }

  return formData;
}

export async function recordMeasurements(
  submission: MeasurementsSubmission,
): Promise<RecordMeasurementsOutcome> {
  const response = await fetchUnlessUnreachable(MEASUREMENTS_API_URL, {
    body: measurementsFormData(submission),
    method: "POST",
  });

  if (response?.status !== RECORDED_STATUS) return RECORD_FAILED;

  const recorded = recordMeasurementsResponseSchema.safeParse(
    await readJson(response),
  );

  if (!recorded.success) return RECORD_FAILED;

  return {
    kind: "recorded",
    refusedViews: PROGRESS_PHOTO_VIEWS.filter(
      (view) => recorded.data.photos[view] === "refused",
    ),
  };
}

export async function removeProgressPhoto(
  photoId: string,
): Promise<RemoveProgressPhotoOutcome> {
  const response = await fetchUnlessUnreachable(progressPhotoUrl(photoId), {
    method: "DELETE",
  });

  return response?.status === REMOVED_STATUS
    ? { kind: "removed" }
    : { kind: "failed" };
}

import type {
  ReadOwnMeasurementHistoryUseCase,
  RecordMeasurementsUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import {
  createBadRequestResponse,
  readFormDataRequestBody,
} from "~/shared/http/index.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  measurementEntryRequestSchema,
  measurementsNudgeSchema,
  measurementsPageSchema,
  measurementsRefusalSchema,
  PHOTO_CONSENT_GIVEN,
  presentMeasurements,
  RECORD_MEASUREMENTS_FIELDS,
  recordMeasurementsResponseSchema,
  type MeasurementEntryRequest,
  type MeasurementsNudge,
  type MeasurementsPage,
} from "~/bounded-contexts/clients/client-profile/public/measurements";
import {
  progressPhotoOutcomesOf,
  receivedProgressPhotosOf,
} from "~/bounded-contexts/clients/client-profile/public/progress-photo-parts";
import { accessContext } from "~/bounded-contexts/access/public/session";

type ClientMeasurementsControllerOptions = {
  readOwnMeasurementHistory: ReadOwnMeasurementHistoryUseCase;
  recordMeasurements: RecordMeasurementsUseCase;
};

type RecordMeasurementsResult = Awaited<
  ReturnType<RecordMeasurementsUseCase["execute"]>
>;

const RECORD_MEASUREMENTS_MAX_BYTES = 32 * 1024 * 1024;

const REFUSAL_STATUS = {
  "not-on-journey": 404,
  ended: 409,
} as const;

export class ClientMeasurementsController {
  constructor(private readonly options: ClientMeasurementsControllerOptions) {}

  async loadPage(args: LoaderFunctionArgs): Promise<MeasurementsPage> {
    const client = args.context
      .get(accessContext)
      .requirePortalAccess("CLIENT");
    const reading = await this.options.readOwnMeasurementHistory.execute({
      authSubjectId: client.authSubjectId,
    });

    if (!reading) {
      throw new Response("Not Found", { status: 404 });
    }

    return measurementsPageSchema.parse({
      history: presentMeasurements(reading.history.newestFirst()),
      consentedAt: reading.consentedAt?.toISOString() ?? null,
      units: reading.units.toSnapshot(),
      dueLine: reading.dueLine,
    });
  }

  async loadNudge(args: LoaderFunctionArgs): Promise<MeasurementsNudge> {
    const client = args.context
      .get(accessContext)
      .requirePortalAccess("CLIENT");
    const reading = await this.options.readOwnMeasurementHistory.execute({
      authSubjectId: client.authSubjectId,
    });

    return measurementsNudgeSchema.parse({
      dueLine: reading?.dueLine ?? null,
    });
  }

  async record(args: ActionFunctionArgs): Promise<Response> {
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });
    const body = await readFormDataRequestBody(args.request, {
      maxBytes: RECORD_MEASUREMENTS_MAX_BYTES,
    });

    if (body.status === "too_large") {
      return Response.json(
        { message: "The measurements and photos are too large to send." },
        { status: 413 },
      );
    }

    if (body.status === "invalid") {
      return unreadableMeasurementsResponse();
    }

    const values = entryValuesOf(body.formData);

    if (!values) {
      return unreadableMeasurementsResponse();
    }

    const result = await this.options.recordMeasurements.execute({
      authSubjectId: client.authSubjectId,
      values,
      consentGiven: photoConsentGivenIn(body.formData),
      photos: await receivedProgressPhotosOf(body.formData),
    });

    return recordingResponse(result);
  }
}

function unreadableMeasurementsResponse(): Response {
  return createBadRequestResponse("The measurements could not be read.");
}

function recordingResponse(result: RecordMeasurementsResult): Response {
  if (result.status === "invalid") {
    return createBadRequestResponse("The measurements are out of range.");
  }

  if (result.status === "not-on-journey" || result.status === "ended") {
    return Response.json(
      measurementsRefusalSchema.parse({ error: result.status }),
      { status: REFUSAL_STATUS[result.status] },
    );
  }

  return Response.json(
    recordMeasurementsResponseSchema.parse({
      entryId: result.entryId,
      photos: progressPhotoOutcomesOf(result.photos),
    }),
    { status: 201 },
  );
}

function entryValuesOf(formData: FormData): MeasurementEntryRequest | null {
  const entry = formData.get(RECORD_MEASUREMENTS_FIELDS.entry);

  if (typeof entry !== "string") {
    return null;
  }

  try {
    const parsed = measurementEntryRequestSchema.safeParse(JSON.parse(entry));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function photoConsentGivenIn(formData: FormData): boolean {
  return (
    formData.get(RECORD_MEASUREMENTS_FIELDS.photoConsent) ===
    PHOTO_CONSENT_GIVEN
  );
}

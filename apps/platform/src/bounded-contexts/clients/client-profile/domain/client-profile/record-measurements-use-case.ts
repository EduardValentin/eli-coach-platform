import type { ClientReachPort } from "../client-reach-port";
import {
  hasMeasurementProblem,
  measurementEntryOf,
  type MeasurementIdsPort,
  type MeasurementValues,
} from "../measurement";
import type { ClockPort } from "../clock-port";

import type { ClientMeasurementRecordsPort } from "./client-measurement-records-port";
import type { ClientProfilesPort } from "./client-profiles-port";
import type { MeasurementIncidentsPort } from "./measurement-incidents-port";
import {
  ProgressPhotoIntake,
  type ProgressPhotoOutcomes,
  type ReceivedProgressPhoto,
} from "./progress-photo-intake";
import type { ProgressPhotoRenditionsPort } from "./progress-photo-renditions-port";
import type { ProgressPhotoStorePort } from "./progress-photo-store-port";
import type { ProgressPhotosPort } from "./progress-photos-port";
import type { ProgressPhotoIdsPort } from "./progress-photo-ids-port";

type RecordMeasurementsCommand = {
  authSubjectId: string;
  values: MeasurementValues;
  consentGiven: boolean;
  photos: ReceivedProgressPhoto[];
};

type RecordMeasurementsResult =
  | {
      status: "recorded";
      entryId: string;
      photos: ProgressPhotoOutcomes;
    }
  | { status: "not-on-journey" }
  | { status: "ended" }
  | { status: "invalid" };

type RecordMeasurementsUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clientProfilesPort: Pick<
    ClientProfilesPort,
    "findByClientId" | "recordPhotoConsent"
  >;
  clientMeasurementRecordsPort: ClientMeasurementRecordsPort;
  measurementIdsPort: MeasurementIdsPort;
  progressPhotosPort: ProgressPhotosPort;
  progressPhotoIdsPort: ProgressPhotoIdsPort;
  progressPhotoStorePort: ProgressPhotoStorePort;
  progressPhotoRenditionsPort: ProgressPhotoRenditionsPort;
  clockPort: ClockPort;
  measurementIncidentsPort: MeasurementIncidentsPort;
};

export class RecordMeasurementsUseCase {
  private readonly intake: ProgressPhotoIntake;

  constructor(private readonly options: RecordMeasurementsUseCaseOptions) {
    this.intake = new ProgressPhotoIntake(options);
  }

  async execute(
    command: RecordMeasurementsCommand,
  ): Promise<RecordMeasurementsResult> {
    const client = await this.options.clientReachPort.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    const now = this.options.clockPort.now();
    const entry = measurementEntryOf(command.values, now);

    if (!entry || hasMeasurementProblem(command.values)) {
      return { status: "invalid" };
    }

    const profile = await this.options.clientProfilesPort.findByClientId(
      client.clientId,
    );
    const consentsNow =
      command.consentGiven && profile !== null && !profile.hasPhotoConsent();

    if (consentsNow) {
      await this.options.clientProfilesPort.recordPhotoConsent(
        client.clientId,
        now,
      );
    }

    const entryId = this.options.measurementIdsPort.generate();
    await this.options.clientMeasurementRecordsPort.record({
      clientId: client.clientId,
      entryId,
      entry,
    });
    this.options.measurementIncidentsPort.measurementEntrySaved({
      clientId: client.clientId,
      entryId,
    });

    const photos = await this.intake.attachTo(
      {
        clientId: client.clientId,
        entryId,
        receivedAt: now,
        photosConsented: consentsNow || (profile?.hasPhotoConsent() ?? false),
      },
      command.photos,
    );

    return { status: "recorded", entryId, photos };
  }
}

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
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  profiles: Pick<ClientProfilesPort, "findByClientId" | "recordPhotoConsent">;
  records: ClientMeasurementRecordsPort;
  measurementIds: MeasurementIdsPort;
  photos: ProgressPhotosPort;
  photoIds: ProgressPhotoIdsPort;
  store: ProgressPhotoStorePort;
  renditions: ProgressPhotoRenditionsPort;
  clock: ClockPort;
  incidents: MeasurementIncidentsPort;
};

export class RecordMeasurementsUseCase {
  private readonly intake: ProgressPhotoIntake;

  constructor(private readonly options: RecordMeasurementsUseCaseOptions) {
    this.intake = new ProgressPhotoIntake(options);
  }

  async execute(
    command: RecordMeasurementsCommand,
  ): Promise<RecordMeasurementsResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    const now = this.options.clock.now();
    const entry = measurementEntryOf(command.values, now);

    if (!entry || hasMeasurementProblem(command.values)) {
      return { status: "invalid" };
    }

    const profile = await this.options.profiles.findByClientId(client.clientId);
    const consentsNow =
      command.consentGiven && profile !== null && !profile.hasPhotoConsent();

    if (consentsNow) {
      await this.options.profiles.recordPhotoConsent(client.clientId, now);
    }

    const entryId = this.options.measurementIds.generate();
    await this.options.records.record({
      clientId: client.clientId,
      entryId,
      entry,
    });
    this.options.incidents.measurementEntrySaved({
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

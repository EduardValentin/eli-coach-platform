import type { ClientReach } from "../client-reach";
import {
  hasMeasurementProblem,
  measurementEntryOf,
  type MeasurementIds,
  type MeasurementValues,
} from "../measurement";
import type { Clock } from "../clock";

import type { ClientMeasurementRecords } from "./client-measurement-records";
import type { ClientProfiles } from "./client-profiles";
import type { MeasurementIncidents } from "./measurement-incidents";
import {
  ProgressPhotoIntake,
  type ProgressPhotoOutcomes,
  type ReceivedProgressPhoto,
} from "./progress-photo-intake";
import type { ProgressPhotoRenditions } from "./progress-photo-renditions";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type { ProgressPhotos } from "./progress-photos";
import type { ProgressPhotoIds } from "./progress-photo-ids";

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
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  profiles: Pick<ClientProfiles, "findByClientId" | "recordPhotoConsent">;
  records: ClientMeasurementRecords;
  measurementIds: MeasurementIds;
  photos: ProgressPhotos;
  photoIds: ProgressPhotoIds;
  store: ProgressPhotoStore;
  renditions: ProgressPhotoRenditions;
  clock: Clock;
  incidents: MeasurementIncidents;
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

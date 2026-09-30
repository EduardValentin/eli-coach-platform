import {
  hasMeasurementProblem,
  measurementEntryOf,
  type MeasurementValues,
} from "../measurement";
import type { Clock } from "../shared";

import type { ClientMeasurementRecords } from "./client-measurement-records";
import type { ClientProfiles } from "./client-profiles";
import type { MeasurementClients } from "./measurement-clients";
import type {
  MeasurementIncidents,
  ProgressPhotoRefusal,
} from "./measurement-incidents";
import {
  ProgressPhoto,
  type ProgressPhotoFileFacts,
  type ProgressPhotoView,
} from "./progress-photo";
import type {
  ProgressPhotoRendition,
  ProgressPhotoRenditions,
} from "./progress-photo-renditions";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type {
  ProgressPhotoIdGenerator,
  ProgressPhotos,
} from "./progress-photos";

type ReceivedProgressPhoto = ProgressPhotoFileFacts & {
  view: ProgressPhotoView;
  bytes: Uint8Array;
};

type RecordMeasurementsCommand = {
  authSubjectId: string;
  values: MeasurementValues;
  consentGiven: boolean;
  photos: ReceivedProgressPhoto[];
};

type ProgressPhotoOutcome = "stored" | "refused";

type ProgressPhotoOutcomes = Partial<
  Record<ProgressPhotoView, ProgressPhotoOutcome>
>;

type RecordMeasurementsResult =
  | {
      status: "recorded";
      entryId: string;
      photos: ProgressPhotoOutcomes;
    }
  | { status: "not-on-journey" }
  | { status: "invalid" };

type RecordMeasurementsUseCaseOptions = {
  clients: MeasurementClients;
  profiles: ClientProfiles;
  records: ClientMeasurementRecords;
  photos: ProgressPhotos;
  photoIds: ProgressPhotoIdGenerator;
  store: ProgressPhotoStore;
  renditions: ProgressPhotoRenditions;
  clock: Clock;
  incidents: MeasurementIncidents;
};

type RecordedEntry = {
  clientId: string;
  entryId: string;
  recordedAt: Date;
  photosConsented: boolean;
};

type RenderedProgressPhoto = Extract<
  ProgressPhotoRendition,
  { status: "rendered" }
>;

const REFUSED_RENDITION: ProgressPhotoRendition = { status: "refused" };

export class RecordMeasurementsUseCase {
  constructor(private readonly options: RecordMeasurementsUseCaseOptions) {}

  async execute(
    command: RecordMeasurementsCommand,
  ): Promise<RecordMeasurementsResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
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

    const entryId = await this.options.records.record(client.clientId, entry);
    this.options.incidents.measurementEntrySaved({
      clientId: client.clientId,
      entryId,
    });

    const recorded: RecordedEntry = {
      clientId: client.clientId,
      entryId,
      recordedAt: now,
      photosConsented: consentsNow || (profile?.hasPhotoConsent() ?? false),
    };
    const photos: ProgressPhotoOutcomes = {};
    for (const photo of command.photos) {
      photos[photo.view] = await this.keepPhoto(recorded, photo);
    }

    return { status: "recorded", entryId, photos };
  }

  private async keepPhoto(
    recorded: RecordedEntry,
    photo: ReceivedProgressPhoto,
  ): Promise<ProgressPhotoOutcome> {
    if (!ProgressPhoto.accepts(photo))
      return this.refuse(recorded, photo, "not-accepted");
    if (!recorded.photosConsented)
      return this.refuse(recorded, photo, "consent-missing");

    const rendition = await this.options.renditions
      .render(photo.bytes)
      .catch(() => REFUSED_RENDITION);

    if (rendition.status === "refused")
      return this.refuse(recorded, photo, "rendition-refused");

    try {
      await this.keepRendition(recorded, photo.view, rendition);
    } catch {
      return this.refuse(recorded, photo, "storage-failed");
    }

    this.options.incidents.progressPhotoStored({
      clientId: recorded.clientId,
      entryId: recorded.entryId,
      view: photo.view,
      receivedBytes: photo.sizeBytes,
      storedBytes: rendition.bytes.byteLength,
    });

    return "stored";
  }

  private async keepRendition(
    recorded: RecordedEntry,
    view: ProgressPhotoView,
    rendition: RenderedProgressPhoto,
  ): Promise<void> {
    const photoId = this.options.photoIds.generate();
    const reference = await this.options.store.store(
      { clientId: recorded.clientId, entryId: recorded.entryId, photoId },
      rendition.bytes,
    );

    await this.options.photos.add(
      ProgressPhoto.stored({
        id: photoId,
        entryId: recorded.entryId,
        clientId: recorded.clientId,
        view,
        reference,
        rendition,
        at: recorded.recordedAt,
      }),
    );
  }

  private refuse(
    recorded: RecordedEntry,
    photo: ReceivedProgressPhoto,
    reason: ProgressPhotoRefusal,
  ): ProgressPhotoOutcome {
    this.options.incidents.progressPhotoRefused({
      clientId: recorded.clientId,
      entryId: recorded.entryId,
      view: photo.view,
      receivedBytes: photo.sizeBytes,
      reason,
    });

    return "refused";
  }
}

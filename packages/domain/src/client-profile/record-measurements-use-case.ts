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
import { ProgressPhoto, type ProgressPhotoView } from "./progress-photo";
import type {
  ProgressPhotoRendition,
  ProgressPhotoRenditions,
} from "./progress-photo-renditions";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type {
  ProgressPhotoIdGenerator,
  ProgressPhotos,
} from "./progress-photos";

type ReceivedProgressPhoto = {
  view: ProgressPhotoView;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
};

type RecordMeasurementsCommand = {
  authSubjectId: string;
  values: MeasurementValues;
  consentGiven: boolean;
  photos: ReceivedProgressPhoto[];
};

type ProgressPhotoOutcome = "stored" | "refused";

type RecordMeasurementsResult =
  | {
      status: "recorded";
      entryId: string;
      photos: Partial<Record<ProgressPhotoView, ProgressPhotoOutcome>>;
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

    const photosConsented = await this.photoConsentOf({
      clientId: client.clientId,
      consentGiven: command.consentGiven,
      now,
    });
    const entryId = await this.options.records.record(client.clientId, entry);
    this.options.incidents.measurementEntrySaved({
      clientId: client.clientId,
      entryId,
    });

    const recorded: RecordedEntry = {
      clientId: client.clientId,
      entryId,
      recordedAt: now,
      photosConsented,
    };
    const photos: Partial<Record<ProgressPhotoView, ProgressPhotoOutcome>> = {};
    for (const photo of command.photos) {
      photos[photo.view] = await this.keepPhoto(recorded, photo);
    }

    return { status: "recorded", entryId, photos };
  }

  private async photoConsentOf(input: {
    clientId: string;
    consentGiven: boolean;
    now: Date;
  }): Promise<boolean> {
    const profile = await this.options.profiles.findByClientId(input.clientId);

    if (!profile) return false;
    if (profile.hasPhotoConsent()) return true;
    if (!input.consentGiven) return false;

    await this.options.profiles.recordPhotoConsent(input.clientId, input.now);

    return true;
  }

  private async keepPhoto(
    entry: RecordedEntry,
    photo: ReceivedProgressPhoto,
  ): Promise<ProgressPhotoOutcome> {
    if (!ProgressPhoto.accepts(photo))
      return this.refuse(entry, photo, "not-accepted");
    if (!entry.photosConsented)
      return this.refuse(entry, photo, "consent-missing");

    const rendition = await this.options.renditions
      .render(photo.bytes)
      .catch(() => REFUSED_RENDITION);

    if (rendition.status === "refused")
      return this.refuse(entry, photo, "rendition-refused");

    try {
      await this.store(entry, photo.view, rendition);
    } catch {
      return this.refuse(entry, photo, "storage-failed");
    }

    this.options.incidents.progressPhotoStored({
      clientId: entry.clientId,
      entryId: entry.entryId,
      view: photo.view,
      receivedBytes: photo.sizeBytes,
      storedBytes: rendition.bytes.byteLength,
    });

    return "stored";
  }

  private async store(
    entry: RecordedEntry,
    view: ProgressPhotoView,
    rendition: RenderedProgressPhoto,
  ): Promise<void> {
    const photoId = this.options.photoIds.generate();
    const reference = await this.options.store.store(
      { clientId: entry.clientId, entryId: entry.entryId, photoId },
      rendition.bytes,
    );

    await this.options.photos.add(
      ProgressPhoto.stored({
        id: photoId,
        entryId: entry.entryId,
        clientId: entry.clientId,
        view,
        reference,
        rendition,
        at: entry.recordedAt,
      }),
    );
  }

  private refuse(
    entry: RecordedEntry,
    photo: ReceivedProgressPhoto,
    reason: ProgressPhotoRefusal,
  ): ProgressPhotoOutcome {
    this.options.incidents.progressPhotoRefused({
      clientId: entry.clientId,
      entryId: entry.entryId,
      view: photo.view,
      receivedBytes: photo.sizeBytes,
      reason,
    });

    return "refused";
  }
}

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

export type ReceivedProgressPhoto = ProgressPhotoFileFacts & {
  view: ProgressPhotoView;
  bytes: Uint8Array;
};

type ProgressPhotoOutcome = "stored" | "refused";

export type ProgressPhotoOutcomes = Partial<
  Record<ProgressPhotoView, ProgressPhotoOutcome>
>;

export type EntryReceivingPhotos = {
  clientId: string;
  entryId: string;
  receivedAt: Date;
  photosConsented: boolean;
};

type ProgressPhotoIntakeOptions = {
  photos: ProgressPhotos;
  photoIds: ProgressPhotoIdGenerator;
  store: ProgressPhotoStore;
  renditions: ProgressPhotoRenditions;
  incidents: MeasurementIncidents;
};

type RenderedProgressPhoto = Extract<
  ProgressPhotoRendition,
  { status: "rendered" }
>;

const REFUSED_RENDITION: ProgressPhotoRendition = { status: "refused" };

export class ProgressPhotoIntake {
  constructor(private readonly options: ProgressPhotoIntakeOptions) {}

  async attachTo(
    entry: EntryReceivingPhotos,
    received: readonly ReceivedProgressPhoto[],
  ): Promise<ProgressPhotoOutcomes> {
    const outcomes: ProgressPhotoOutcomes = {};

    for (const photo of received) {
      outcomes[photo.view] = await this.keepPhoto(entry, photo);
    }

    return outcomes;
  }

  private async keepPhoto(
    entry: EntryReceivingPhotos,
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
      await this.keepRendition(entry, photo.view, rendition);
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

  private async keepRendition(
    entry: EntryReceivingPhotos,
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
        at: entry.receivedAt,
      }),
    );
  }

  private refuse(
    entry: EntryReceivingPhotos,
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

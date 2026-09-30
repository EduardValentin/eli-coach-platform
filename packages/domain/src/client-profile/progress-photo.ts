import type { ProgressPhotoReference } from "./progress-photo-reference";

export const PROGRESS_PHOTO_VIEWS = ["front", "side", "back"] as const;

export type ProgressPhotoView = (typeof PROGRESS_PHOTO_VIEWS)[number];

export const ACCEPTED_PROGRESS_PHOTO_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_PROGRESS_PHOTO_BYTES = 10 * 1024 * 1024;

export type ProgressPhotoSnapshot = {
  id: string;
  entryId: string;
  clientId: string;
  view: ProgressPhotoView;
  reference: ProgressPhotoReference;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

type ReceivedProgressPhoto = { mimeType: string; sizeBytes: number };

type StoredProgressPhotoInput = {
  id: string;
  entryId: string;
  clientId: string;
  view: ProgressPhotoView;
  reference: ProgressPhotoReference;
  rendition: { bytes: Uint8Array; mimeType: string };
  at: Date;
};

export class ProgressPhoto {
  private constructor(private readonly snapshot: ProgressPhotoSnapshot) {}

  static accepts(photo: ReceivedProgressPhoto): boolean {
    return (
      ACCEPTED_PROGRESS_PHOTO_TYPES.includes(photo.mimeType) &&
      photo.sizeBytes <= MAX_PROGRESS_PHOTO_BYTES
    );
  }

  static stored(input: StoredProgressPhotoInput): ProgressPhoto {
    return new ProgressPhoto({
      id: input.id,
      entryId: input.entryId,
      clientId: input.clientId,
      view: input.view,
      reference: input.reference,
      mimeType: input.rendition.mimeType,
      sizeBytes: input.rendition.bytes.byteLength,
      createdAt: input.at,
    });
  }

  static reconstitute(snapshot: ProgressPhotoSnapshot): ProgressPhoto {
    return new ProgressPhoto(snapshot);
  }

  isOwnedBy(clientId: string): boolean {
    return this.snapshot.clientId === clientId;
  }

  toSnapshot(): ProgressPhotoSnapshot {
    return { ...this.snapshot, reference: { ...this.snapshot.reference } };
  }
}

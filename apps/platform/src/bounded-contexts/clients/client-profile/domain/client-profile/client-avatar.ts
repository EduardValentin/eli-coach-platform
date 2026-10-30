import {
  ACCEPTED_PROGRESS_PHOTO_TYPES,
  MAX_PROGRESS_PHOTO_BYTES,
  type ProgressPhotoFileFacts,
} from "./progress-photo";
import type { ClientAvatarReference } from "./client-avatar-store-port";

export const CLIENT_AVATAR_RENDITION = {
  edgePixels: 512,
  quality: 82,
} as const;

export type ClientAvatarSnapshot = {
  clientId: string;
  avatarId: string;
  reference: ClientAvatarReference;
  mimeType: string;
  sizeBytes: number;
  updatedAt: Date;
};

type UploadedClientAvatarInput = {
  avatarId: string;
  clientId: string;
  reference: ClientAvatarReference;
  rendition: { bytes: Uint8Array; mimeType: string };
  at: Date;
};

export class ClientAvatar {
  private constructor(private readonly snapshot: ClientAvatarSnapshot) {}

  static accepts(file: ProgressPhotoFileFacts): boolean {
    return (
      ACCEPTED_PROGRESS_PHOTO_TYPES.includes(file.mimeType) &&
      file.sizeBytes <= MAX_PROGRESS_PHOTO_BYTES
    );
  }

  static uploaded(input: UploadedClientAvatarInput): ClientAvatar {
    return new ClientAvatar({
      clientId: input.clientId,
      avatarId: input.avatarId,
      reference: input.reference,
      mimeType: input.rendition.mimeType,
      sizeBytes: input.rendition.bytes.byteLength,
      updatedAt: input.at,
    });
  }

  static reconstitute(snapshot: ClientAvatarSnapshot): ClientAvatar {
    return new ClientAvatar(snapshot);
  }

  isOwnedBy(clientId: string): boolean {
    return this.snapshot.clientId === clientId;
  }

  toSnapshot(): ClientAvatarSnapshot {
    return { ...this.snapshot, reference: { ...this.snapshot.reference } };
  }
}

import type { Clock } from "../shared";

import type { ClientProfiles } from "./client-profiles";
import type { MeasurementIncidents } from "./measurement-incidents";
import {
  ProgressPhotoIntake,
  type ProgressPhotoOutcomes,
  type ReceivedProgressPhoto,
} from "./progress-photo-intake";
import type { ProgressPhotoRenditions } from "./progress-photo-renditions";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type {
  ProgressPhotoIdGenerator,
  ProgressPhotos,
} from "./progress-photos";

type AttachProgressPhotosCommand = {
  clientId: string;
  entryId: string;
  photos: readonly ReceivedProgressPhoto[];
};

type AttachProgressPhotosUseCaseOptions = {
  profiles: ClientProfiles;
  photos: ProgressPhotos;
  photoIds: ProgressPhotoIdGenerator;
  store: ProgressPhotoStore;
  renditions: ProgressPhotoRenditions;
  clock: Clock;
  incidents: MeasurementIncidents;
};

const UNREADABLE_CONSENT = null;

export class AttachProgressPhotosUseCase {
  private readonly intake: ProgressPhotoIntake;

  constructor(private readonly options: AttachProgressPhotosUseCaseOptions) {
    this.intake = new ProgressPhotoIntake(options);
  }

  async execute(
    command: AttachProgressPhotosCommand,
  ): Promise<ProgressPhotoOutcomes> {
    const photosConsented = await this.options.profiles
      .findByClientId(command.clientId)
      .then(
        (profile) => profile?.hasPhotoConsent() ?? false,
        () => UNREADABLE_CONSENT,
      );

    if (photosConsented === UNREADABLE_CONSENT) {
      return this.refuseUnreadConsent(command);
    }

    return this.intake.attachTo(
      {
        clientId: command.clientId,
        entryId: command.entryId,
        receivedAt: this.options.clock.now(),
        photosConsented,
      },
      command.photos,
    );
  }

  private refuseUnreadConsent(
    command: AttachProgressPhotosCommand,
  ): ProgressPhotoOutcomes {
    const outcomes: ProgressPhotoOutcomes = {};

    for (const photo of command.photos) {
      this.options.incidents.progressPhotoRefused({
        clientId: command.clientId,
        entryId: command.entryId,
        view: photo.view,
        receivedBytes: photo.sizeBytes,
        reason: "storage-failed",
      });
      outcomes[photo.view] = "refused";
    }

    return outcomes;
  }
}

import type { ClockPort } from "../clock-port";

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

type AttachProgressPhotosCommand = {
  clientId: string;
  entryId: string;
  photos: readonly ReceivedProgressPhoto[];
};

type AttachProgressPhotosUseCaseOptions = {
  clientProfilesPort: Pick<ClientProfilesPort, "findByClientId">;
  progressPhotosPort: ProgressPhotosPort;
  progressPhotoIdsPort: ProgressPhotoIdsPort;
  progressPhotoStorePort: ProgressPhotoStorePort;
  progressPhotoRenditionsPort: ProgressPhotoRenditionsPort;
  clockPort: ClockPort;
  measurementIncidentsPort: MeasurementIncidentsPort;
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
    const photosConsented = await this.options.clientProfilesPort
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
        receivedAt: this.options.clockPort.now(),
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
      this.options.measurementIncidentsPort.progressPhotoRefused({
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

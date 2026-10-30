import type { AccountRole } from "../account-role";
import type { ClientReachPort } from "../client-reach-port";

import type { MeasurementIncidentsPort } from "./measurement-incidents-port";
import type { ProgressPhoto } from "./progress-photo";
import type { ProgressPhotoStorePort } from "./progress-photo-store-port";
import type { ProgressPhotosPort } from "./progress-photos-port";

type ProgressPhotoRequester = {
  role: AccountRole;
  authSubjectId: string;
};

type OpenProgressPhotoCommand = {
  photoId: string;
  requester: ProgressPhotoRequester;
};

type OpenProgressPhotoResult =
  | { status: "opened"; bytes: Uint8Array; mimeType: string }
  | { status: "not-found" };

type OpenProgressPhotoUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  progressPhotosPort: ProgressPhotosPort;
  progressPhotoStorePort: ProgressPhotoStorePort;
  measurementIncidentsPort: MeasurementIncidentsPort;
};

export class OpenProgressPhotoUseCase {
  constructor(private readonly options: OpenProgressPhotoUseCaseOptions) {}

  async execute(
    command: OpenProgressPhotoCommand,
  ): Promise<OpenProgressPhotoResult> {
    const photo = await this.options.progressPhotosPort.findById(
      command.photoId,
    );

    if (!photo) {
      return { status: "not-found" };
    }

    if (!(await this.maySee(photo, command.requester))) {
      this.options.measurementIncidentsPort.progressPhotoAccessRefused({
        requesterRole: command.requester.role,
        photoId: command.photoId,
      });

      return { status: "not-found" };
    }

    const { reference, mimeType } = photo.toSnapshot();
    const bytes = await this.options.progressPhotoStorePort.open(reference);

    if (!bytes) {
      return { status: "not-found" };
    }

    return { status: "opened", bytes, mimeType };
  }

  private async maySee(
    photo: ProgressPhoto,
    requester: ProgressPhotoRequester,
  ): Promise<boolean> {
    if (requester.role === "COACH") return true;

    const client = await this.options.clientReachPort.findByAuthSubjectId(
      requester.authSubjectId,
    );

    return client !== null && photo.isOwnedBy(client.clientId);
  }
}

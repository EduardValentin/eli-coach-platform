import type { AccountRole } from "../account-role";
import type { ClientReachPort } from "../client-reach-port";

import type { MeasurementIncidentsPort } from "./measurement-incidents-port";
import type { ProgressPhotoStorePort } from "./progress-photo-store-port";
import type { ProgressPhotosPort } from "./progress-photos-port";

type ProgressPhotoRequester = { role: AccountRole; authSubjectId: string };

type RemoveProgressPhotoCommand = {
  photoId: string;
  requester: ProgressPhotoRequester;
};

type RemoveProgressPhotoResult =
  { status: "removed" } | { status: "not-found" };

type RemoveProgressPhotoUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  progressPhotosPort: ProgressPhotosPort;
  progressPhotoStorePort: ProgressPhotoStorePort;
  measurementIncidentsPort: MeasurementIncidentsPort;
};

export class RemoveProgressPhotoUseCase {
  constructor(private readonly options: RemoveProgressPhotoUseCaseOptions) {}

  async execute(
    command: RemoveProgressPhotoCommand,
  ): Promise<RemoveProgressPhotoResult> {
    const [client, photo] = await Promise.all([
      this.options.clientReachPort.findByAuthSubjectId(
        command.requester.authSubjectId,
      ),
      this.options.progressPhotosPort.findById(command.photoId),
    ]);

    if (!photo) {
      return { status: "not-found" };
    }

    if (!client || !photo.isOwnedBy(client.clientId)) {
      this.options.measurementIncidentsPort.progressPhotoAccessRefused({
        requesterRole: command.requester.role,
        photoId: command.photoId,
      });

      return { status: "not-found" };
    }

    const { id, entryId, clientId, view, reference } = photo.toSnapshot();
    await this.options.progressPhotosPort.delete(id);
    await this.options.progressPhotoStorePort.delete(reference);
    this.options.measurementIncidentsPort.progressPhotoDeleted({
      clientId,
      entryId,
      photoId: id,
      view,
    });

    return { status: "removed" };
  }
}

import type { AccountRole } from "../account";

import type { MeasurementClients } from "./measurement-clients";
import type { MeasurementIncidents } from "./measurement-incidents";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type { ProgressPhotos } from "./progress-photos";

type ProgressPhotoRequester = { role: AccountRole; authSubjectId: string };

type RemoveProgressPhotoCommand = {
  photoId: string;
  requester: ProgressPhotoRequester;
};

type RemoveProgressPhotoResult =
  { status: "removed" } | { status: "not-found" };

type RemoveProgressPhotoUseCaseOptions = {
  clients: MeasurementClients;
  photos: ProgressPhotos;
  store: ProgressPhotoStore;
  incidents: MeasurementIncidents;
};

export class RemoveProgressPhotoUseCase {
  constructor(private readonly options: RemoveProgressPhotoUseCaseOptions) {}

  async execute(
    command: RemoveProgressPhotoCommand,
  ): Promise<RemoveProgressPhotoResult> {
    const [client, photo] = await Promise.all([
      this.options.clients.findByAuthSubjectId(command.requester.authSubjectId),
      this.options.photos.findById(command.photoId),
    ]);

    if (!photo) {
      return { status: "not-found" };
    }

    if (!client || !photo.isOwnedBy(client.clientId)) {
      this.options.incidents.progressPhotoAccessRefused({
        requesterRole: command.requester.role,
        photoId: command.photoId,
      });

      return { status: "not-found" };
    }

    const { id, entryId, clientId, view, reference } = photo.toSnapshot();
    await this.options.photos.delete(id);
    await this.options.store.delete(reference);
    this.options.incidents.progressPhotoDeleted({
      clientId,
      entryId,
      photoId: id,
      view,
    });

    return { status: "removed" };
  }
}

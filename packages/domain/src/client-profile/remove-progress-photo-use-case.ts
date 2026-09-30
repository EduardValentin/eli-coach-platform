import type { MeasurementClients } from "./measurement-clients";
import type { MeasurementIncidents } from "./measurement-incidents";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type { ProgressPhotos } from "./progress-photos";

type RemoveProgressPhotoCommand = {
  photoId: string;
  authSubjectId: string;
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
      this.options.clients.findByAuthSubjectId(command.authSubjectId),
      this.options.photos.findById(command.photoId),
    ]);

    if (!client || !photo?.isOwnedBy(client.clientId)) {
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

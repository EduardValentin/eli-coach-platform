import type { AccountRole } from "../account";

import type { MeasurementClients } from "./measurement-clients";
import type { MeasurementIncidents } from "./measurement-incidents";
import type { ProgressPhoto } from "./progress-photo";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type { ProgressPhotos } from "./progress-photos";

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
  clients: MeasurementClients;
  photos: ProgressPhotos;
  store: ProgressPhotoStore;
  incidents: MeasurementIncidents;
};

export class OpenProgressPhotoUseCase {
  constructor(private readonly options: OpenProgressPhotoUseCaseOptions) {}

  async execute(
    command: OpenProgressPhotoCommand,
  ): Promise<OpenProgressPhotoResult> {
    const photo = await this.options.photos.findById(command.photoId);

    if (!photo) {
      return { status: "not-found" };
    }

    if (!(await this.maySee(photo, command.requester))) {
      this.options.incidents.progressPhotoAccessRefused({
        requesterRole: command.requester.role,
        photoId: command.photoId,
      });

      return { status: "not-found" };
    }

    const { reference, mimeType } = photo.toSnapshot();
    const bytes = await this.options.store.open(reference);

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

    const client = await this.options.clients.findByAuthSubjectId(
      requester.authSubjectId,
    );

    return client !== null && photo.isOwnedBy(client.clientId);
  }
}

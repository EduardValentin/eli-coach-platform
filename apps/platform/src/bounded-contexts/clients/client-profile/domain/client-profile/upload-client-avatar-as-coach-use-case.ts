import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";

import {
  ClientAvatarIntake,
  type ClientAvatarIntakeOptions,
  type ClientAvatarUpload,
  type ReceivedClientAvatar,
} from "./client-avatar-intake";

type UploadClientAvatarAsCoachCommand = {
  clientId: string;
  avatar: ReceivedClientAvatar;
};

type UploadClientAvatarAsCoachResult =
  ClientAvatarUpload | { status: "not-found" };

type UploadClientAvatarAsCoachUseCaseOptions = ClientAvatarIntakeOptions & {
  clients: Pick<ClientReach, "findById">;
};

export class UploadClientAvatarAsCoachUseCase {
  constructor(
    private readonly options: UploadClientAvatarAsCoachUseCaseOptions,
  ) {}

  async execute(
    command: UploadClientAvatarAsCoachCommand,
  ): Promise<UploadClientAvatarAsCoachResult> {
    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      return { status: "not-found" };
    }

    return new ClientAvatarIntake(this.options).upload(
      client.clientId,
      command.avatar,
    );
  }
}

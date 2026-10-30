import type { ClientReachPort } from "../client-reach-port";

import {
  ClientAvatarIntake,
  type ClientAvatarIntakeOptions,
  type ClientAvatarUpload,
  type ReceivedClientAvatar,
} from "./client-avatar-intake";

type UploadOwnClientAvatarCommand = {
  authSubjectId: string;
  avatar: ReceivedClientAvatar;
};

type UploadOwnClientAvatarResult =
  ClientAvatarUpload | { status: "not-on-journey" } | { status: "ended" };

type UploadOwnClientAvatarUseCaseOptions = ClientAvatarIntakeOptions & {
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
};

export class UploadOwnClientAvatarUseCase {
  constructor(private readonly options: UploadOwnClientAvatarUseCaseOptions) {}

  async execute(
    command: UploadOwnClientAvatarCommand,
  ): Promise<UploadOwnClientAvatarResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    return new ClientAvatarIntake(this.options).upload(
      client.clientId,
      command.avatar,
    );
  }
}

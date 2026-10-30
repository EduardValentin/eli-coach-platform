import type { AccountRole } from "../account-role";
import type { ClientReachPort } from "../client-reach-port";

import type { ClientAvatar } from "./client-avatar";
import type { ClientAvatarStorePort } from "./client-avatar-store-port";
import type { ClientAvatarsPort } from "./client-avatars-port";

type ClientAvatarRequester = {
  role: AccountRole;
  authSubjectId: string;
};

type OpenClientAvatarCommand = {
  clientId: string;
  requester: ClientAvatarRequester;
};

type OpenClientAvatarResult =
  | { status: "opened"; bytes: Uint8Array; mimeType: string }
  | { status: "not-found" };

type OpenClientAvatarUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clientAvatarsPort: Pick<ClientAvatarsPort, "findByClientId">;
  clientAvatarStorePort: Pick<ClientAvatarStorePort, "open">;
};

export class OpenClientAvatarUseCase {
  constructor(private readonly options: OpenClientAvatarUseCaseOptions) {}

  async execute(
    command: OpenClientAvatarCommand,
  ): Promise<OpenClientAvatarResult> {
    const avatar = await this.options.clientAvatarsPort.findByClientId(
      command.clientId,
    );

    if (!avatar || !(await this.maySee(avatar, command.requester))) {
      return { status: "not-found" };
    }

    const { reference, mimeType } = avatar.toSnapshot();
    const bytes = await this.options.clientAvatarStorePort.open(reference);

    return bytes
      ? { status: "opened", bytes, mimeType }
      : { status: "not-found" };
  }

  private async maySee(
    avatar: ClientAvatar,
    requester: ClientAvatarRequester,
  ): Promise<boolean> {
    if (requester.role === "COACH") return true;

    const client = await this.options.clientReachPort.findByAuthSubjectId(
      requester.authSubjectId,
    );

    return client !== null && avatar.isOwnedBy(client.clientId);
  }
}

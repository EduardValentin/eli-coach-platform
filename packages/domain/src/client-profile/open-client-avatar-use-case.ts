import type { AccountRole } from "../account";
import type { ClientReach } from "../client";

import type { ClientAvatar } from "./client-avatar";
import type { ClientAvatarStore } from "./client-avatar-store";
import type { ClientAvatars } from "./client-avatars";

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
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  avatars: Pick<ClientAvatars, "findByClientId">;
  store: Pick<ClientAvatarStore, "open">;
};

export class OpenClientAvatarUseCase {
  constructor(private readonly options: OpenClientAvatarUseCaseOptions) {}

  async execute(
    command: OpenClientAvatarCommand,
  ): Promise<OpenClientAvatarResult> {
    const avatar = await this.options.avatars.findByClientId(command.clientId);

    if (!avatar || !(await this.maySee(avatar, command.requester))) {
      return { status: "not-found" };
    }

    const { reference, mimeType } = avatar.toSnapshot();
    const bytes = await this.options.store.open(reference);

    return bytes
      ? { status: "opened", bytes, mimeType }
      : { status: "not-found" };
  }

  private async maySee(
    avatar: ClientAvatar,
    requester: ClientAvatarRequester,
  ): Promise<boolean> {
    if (requester.role === "COACH") return true;

    const client = await this.options.clients.findByAuthSubjectId(
      requester.authSubjectId,
    );

    return client !== null && avatar.isOwnedBy(client.clientId);
  }
}

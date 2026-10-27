import type { ClientAvatarSnapshot } from "./client-avatar";
import type { ClientAvatars } from "./client-avatars";

type ListClientAvatarsUseCaseOptions = {
  avatars: Pick<ClientAvatars, "findByClientIds">;
};

export class ListClientAvatarsUseCase {
  constructor(private readonly options: ListClientAvatarsUseCaseOptions) {}

  async execute(clientIds: readonly string[]): Promise<ClientAvatarSnapshot[]> {
    const avatars = await this.options.avatars.findByClientIds(clientIds);

    return avatars.map((avatar) => avatar.toSnapshot());
  }
}

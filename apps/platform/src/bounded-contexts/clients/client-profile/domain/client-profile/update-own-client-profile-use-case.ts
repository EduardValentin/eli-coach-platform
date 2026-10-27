import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";

import type { ClientProfileProblems } from "./client-profile";
import type { ClientProfiles } from "./client-profiles";
import type { SharedCoachingFacts } from "./coaching-facts";

type UpdateOwnClientProfileCommand = {
  authSubjectId: string;
  facts: SharedCoachingFacts;
};

type UpdateOwnClientProfileResult =
  | { status: "saved" }
  | { status: "not-on-journey" }
  | { status: "ended" }
  | { status: "not-seeded" }
  | { status: "invalid"; problems: ClientProfileProblems }
  | { status: "changed-meanwhile" };

type UpdateOwnClientProfileUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  profiles: Pick<ClientProfiles, "findByClientId" | "saveSharedFacts">;
  clock: Clock;
};

export class UpdateOwnClientProfileUseCase {
  constructor(private readonly options: UpdateOwnClientProfileUseCaseOptions) {}

  async execute(
    command: UpdateOwnClientProfileCommand,
  ): Promise<UpdateOwnClientProfileResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    const profile = await this.options.profiles.findByClientId(client.clientId);

    if (!profile) {
      return { status: "not-on-journey" };
    }

    const outcome = profile.editSharedFacts(
      command.facts,
      this.options.clock.now(),
    );

    if (outcome.status !== "edited") {
      return outcome;
    }

    const saved = await this.options.profiles.saveSharedFacts({
      profile: outcome.profile,
      expectedUpdatedAt: profile.toSnapshot().updatedAt,
    });

    return { status: saved };
  }
}

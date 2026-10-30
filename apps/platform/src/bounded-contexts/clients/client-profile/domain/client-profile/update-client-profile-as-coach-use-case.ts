import type { ClockPort } from "../clock-port";

import type { ClientProfileProblems, CoachProfileEdit } from "./client-profile";
import type { ClientProfilesPort } from "./client-profiles-port";

type UpdateClientProfileAsCoachCommand = {
  clientId: string;
  edit: CoachProfileEdit;
};

type UpdateClientProfileAsCoachResult =
  | { status: "saved" }
  | { status: "not-found" }
  | { status: "not-seeded" }
  | { status: "invalid"; problems: ClientProfileProblems }
  | { status: "changed-meanwhile" };

type UpdateClientProfileAsCoachUseCaseOptions = {
  clientProfilesPort: Pick<
    ClientProfilesPort,
    "findByClientId" | "saveCoachFacts"
  >;
  clockPort: ClockPort;
};

export class UpdateClientProfileAsCoachUseCase {
  constructor(
    private readonly options: UpdateClientProfileAsCoachUseCaseOptions,
  ) {}

  async execute(
    command: UpdateClientProfileAsCoachCommand,
  ): Promise<UpdateClientProfileAsCoachResult> {
    const profile = await this.options.clientProfilesPort.findByClientId(
      command.clientId,
    );

    if (!profile) {
      return { status: "not-found" };
    }

    const outcome = profile.editCoachFacts(
      command.edit,
      this.options.clockPort.now(),
    );

    if (outcome.status !== "edited") {
      return outcome;
    }

    const saved = await this.options.clientProfilesPort.saveCoachFacts({
      profile: outcome.profile,
      expectedUpdatedAt: profile.toSnapshot().updatedAt,
    });

    return { status: saved };
  }
}

import type { ClockPort } from "../clock-port";
import {
  CLIENT_EQUIPMENT,
  type ClientEquipment,
  type ClientProfileProblems,
  type ClientProfilesPort,
} from "../client-profile";

type SaveClientEquipmentCommand = {
  clientId: string;
  equipment: readonly string[];
};

type SaveClientEquipmentResult =
  | { status: "saved" }
  | { status: "unchanged" }
  | { status: "not-found" }
  | { status: "not-seeded" }
  | { status: "unknown-equipment" }
  | { status: "invalid"; problems: ClientProfileProblems }
  | { status: "changed-meanwhile" };

type SaveClientEquipmentUseCaseOptions = {
  clientProfilesPort: Pick<
    ClientProfilesPort,
    "findByClientId" | "saveSharedFacts"
  >;
  clockPort: ClockPort;
};

export class SaveClientEquipmentUseCase {
  constructor(private readonly options: SaveClientEquipmentUseCaseOptions) {}

  async execute(
    command: SaveClientEquipmentCommand,
  ): Promise<SaveClientEquipmentResult> {
    const equipment = this.knownEquipmentOf(command.equipment);

    if (!equipment) {
      return { status: "unknown-equipment" };
    }

    const profile = await this.options.clientProfilesPort.findByClientId(
      command.clientId,
    );

    if (!profile) {
      return { status: "not-found" };
    }

    const outcome = profile.editEquipment(
      equipment,
      this.options.clockPort.now(),
    );

    if (outcome.status !== "edited") {
      return outcome;
    }

    const saved = await this.options.clientProfilesPort.saveSharedFacts({
      profile: outcome.profile,
      expectedUpdatedAt: profile.toSnapshot().updatedAt,
    });

    return { status: saved };
  }

  private knownEquipmentOf(
    values: readonly string[],
  ): ClientEquipment[] | null {
    const equipment = CLIENT_EQUIPMENT.filter((item) => values.includes(item));

    return equipment.length === new Set(values).size ? equipment : null;
  }
}

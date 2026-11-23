import type {
  ClientCoachingPort,
  EquipmentOption,
} from "./client-coaching-port";
import type {
  ClientIdentity,
  ClientIdentityPort,
} from "./client-identity-port";
import type { CoachingEndedPort } from "./coaching-ended-port";
import { Program } from "./program";
import { ProgramSetup, type ProgramSetupValues } from "./program-setup";
import type { ProgramStorePort } from "./program-store-port";
import { SplitTemplate } from "./split-template";
import {
  TRAINING_DAY_OPTIONS,
  type SplitShape,
  type TrainingDays,
} from "./vocabulary";

type ReadProgramSetupCommand = { clientId: string };

export type ProgramSetupReading =
  | { status: "unknown-client" | "has-program" | "coaching-ended" }
  | { status: "not-approved"; client: ClientIdentity }
  | {
      status: "ready";
      client: ClientIdentity;
      startingValues: ProgramSetupValues;
      goalOptions: string[];
      equipmentOptions: EquipmentOption[];
      splitShapeByTrainingDays: Record<TrainingDays, SplitShape>;
    };

type ReadProgramSetupUseCaseOptions = {
  clientIdentityPort: ClientIdentityPort;
  coachingEndedPort: CoachingEndedPort;
  clientCoachingPort: Pick<ClientCoachingPort, "find">;
  programStorePort: Pick<ProgramStorePort, "findByClientId">;
};

export class ReadProgramSetupUseCase {
  constructor(private readonly options: ReadProgramSetupUseCaseOptions) {}

  async execute({
    clientId,
  }: ReadProgramSetupCommand): Promise<ProgramSetupReading> {
    const {
      clientIdentityPort,
      coachingEndedPort,
      clientCoachingPort,
      programStorePort,
    } = this.options;
    const client = await clientIdentityPort.find(clientId);

    if (!client) {
      return { status: "unknown-client" };
    }

    const coachingEnded = await coachingEndedPort.hasEnded(clientId);
    const clientCoaching = await clientCoachingPort.find(clientId);
    const program = await programStorePort.findByClientId(clientId);
    const eligibility = Program.eligibilityFor({
      client,
      coachingEnded,
      clientCoaching,
      program,
    });

    switch (eligibility.status) {
      case "has-program":
      case "coaching-ended":
        return { status: eligibility.status };
      case "not-approved":
        return { status: "not-approved", client: eligibility.client };
      case "eligible":
        return {
          status: "ready",
          client: eligibility.client,
          startingValues: ProgramSetup.startingValues(
            eligibility.coachingFacts,
          ),
          goalOptions: eligibility.clientCoaching.goalOptions,
          equipmentOptions: eligibility.clientCoaching.equipmentOptions,
          splitShapeByTrainingDays: this.splitShapeByTrainingDays(),
        };
    }
  }

  private splitShapeByTrainingDays(): Record<TrainingDays, SplitShape> {
    return Object.fromEntries(
      TRAINING_DAY_OPTIONS.map((days) => [
        days,
        SplitTemplate.forTrainingDays(days).shape,
      ]),
    ) as Record<TrainingDays, SplitShape>;
  }
}

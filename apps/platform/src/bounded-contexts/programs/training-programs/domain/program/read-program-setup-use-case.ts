import type {
  ClientCoaching,
  ClientCoachingPort,
  ClientGender,
  EquipmentOption,
} from "./client-coaching-port";
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

type ProgramClient = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: ClientGender;
};

export type ProgramSetupReading =
  | { status: "unknown-client" | "has-program" | "coaching-ended" }
  | { status: "not-approved"; client: ProgramClient }
  | {
      status: "ready";
      client: ProgramClient;
      startingValues: ProgramSetupValues;
      goalOptions: string[];
      equipmentOptions: EquipmentOption[];
      splitShapeByTrainingDays: Record<TrainingDays, SplitShape>;
    };

type ReadProgramSetupUseCaseOptions = {
  clientCoachingPort: Pick<ClientCoachingPort, "find">;
  programStorePort: Pick<ProgramStorePort, "findByClientId">;
};

export class ReadProgramSetupUseCase {
  constructor(private readonly options: ReadProgramSetupUseCaseOptions) {}

  async execute({
    clientId,
  }: ReadProgramSetupCommand): Promise<ProgramSetupReading> {
    const { clientCoachingPort, programStorePort } = this.options;
    const clientCoaching = await clientCoachingPort.find(clientId);

    if (!clientCoaching) {
      return { status: "unknown-client" };
    }

    const program = await programStorePort.findByClientId(clientId);
    const eligibility = Program.eligibilityFor({ clientCoaching, program });

    switch (eligibility.status) {
      case "has-program":
      case "coaching-ended":
        return { status: eligibility.status };
      case "not-approved":
        return {
          status: "not-approved",
          client: this.clientOf(eligibility.clientCoaching),
        };
      case "eligible":
        return {
          status: "ready",
          client: this.clientOf(eligibility.clientCoaching),
          startingValues: ProgramSetup.startingValues(
            eligibility.coachingFacts,
          ),
          goalOptions: eligibility.clientCoaching.goalOptions,
          equipmentOptions: eligibility.clientCoaching.equipmentOptions,
          splitShapeByTrainingDays: this.splitShapeByTrainingDays(),
        };
    }
  }

  private clientOf({
    clientId,
    firstName,
    lastName,
    gender,
  }: ClientCoaching): ProgramClient {
    return { clientId, firstName, lastName, gender };
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

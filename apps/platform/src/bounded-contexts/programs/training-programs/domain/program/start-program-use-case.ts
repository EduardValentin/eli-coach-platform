import type { ClockPort } from "../clock-port";
import type { CardioExercisesPort } from "./cardio-exercises-port";
import type { ClientCoachingPort } from "./client-coaching-port";
import { Program } from "./program";
import type { ProgramIdsPort } from "./program-ids-port";
import type { ProgramIncidentsPort } from "./program-incidents-port";
import {
  ProgramSetup,
  type ProgramSetupProblems,
  type ProgramSetupValues,
} from "./program-setup";
import type { ProgramStorePort } from "./program-store-port";
import { ProgramSuggestions } from "./program-suggestions";

type StartProgramCommand = {
  coachAccountId: string;
  clientId: string;
  setup: ProgramSetupValues;
};

export type StartProgramResult =
  | { status: "started" }
  | {
      status:
        "unknown-client" | "has-program" | "coaching-ended" | "not-approved";
    }
  | { status: "invalid"; problems: ProgramSetupProblems };

type ProgramStart = {
  command: StartProgramCommand;
  setup: ProgramSetup;
  currentEquipment: readonly string[];
};

type StartProgramUseCaseOptions = {
  programStorePort: ProgramStorePort;
  clientCoachingPort: ClientCoachingPort;
  cardioExercisesPort: CardioExercisesPort;
  programIdsPort: ProgramIdsPort;
  clockPort: ClockPort;
  programIncidentsPort: ProgramIncidentsPort;
};

export class StartProgramUseCase {
  constructor(private readonly options: StartProgramUseCaseOptions) {}

  async execute(command: StartProgramCommand): Promise<StartProgramResult> {
    const { clientCoachingPort, programStorePort } = this.options;
    const clientCoaching = await clientCoachingPort.find(command.clientId);
    const eligibility = Program.eligibilityFor({
      clientCoaching,
      program:
        clientCoaching &&
        (await programStorePort.findByClientId(command.clientId)),
    });

    if (eligibility.status !== "eligible") {
      return { status: eligibility.status };
    }

    const setup = ProgramSetup.from(command.setup, eligibility.clientCoaching);

    if (setup.status === "invalid") {
      return setup;
    }

    try {
      return await this.start({
        command,
        setup: setup.setup,
        currentEquipment: eligibility.coachingFacts.equipment,
      });
    } catch (error) {
      this.options.programIncidentsPort.programStartFailed({
        clientId: command.clientId,
        error,
      });

      throw error;
    }
  }

  private async start({
    command,
    setup,
    currentEquipment,
  }: ProgramStart): Promise<StartProgramResult> {
    const {
      programStorePort,
      clientCoachingPort,
      cardioExercisesPort,
      programIdsPort,
      clockPort,
    } = this.options;
    const suggestions = new ProgramSuggestions({
      cardioExercises: await cardioExercisesPort.listFor(
        command.coachAccountId,
      ),
      newId: () => programIdsPort.generate(),
    });
    const program = Program.started({
      id: programIdsPort.generate(),
      clientId: command.clientId,
      setup,
      content: suggestions.initialContent(setup.values),
      at: clockPort.now(),
    });

    if ((await programStorePort.add(program)) === "client-has-program") {
      return { status: "has-program" };
    }

    if (setup.changesEquipment(currentEquipment)) {
      await clientCoachingPort.saveEquipment({
        clientId: command.clientId,
        equipment: setup.values.equipment,
      });
    }

    return { status: "started" };
  }
}

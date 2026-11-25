import type { ClockPort } from "../clock-port";
import type { ClientCoachingPort } from "./client-coaching-port";
import type { ClientIdentityPort } from "./client-identity-port";
import type { CoachingEndedPort } from "./coaching-ended-port";
import type { LibraryExercisesPort } from "./library-exercises-port";
import { Program } from "./program";
import type { ProgramIdsPort } from "./program-ids-port";
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
};

type StartProgramUseCaseOptions = {
  programStorePort: Pick<ProgramStorePort, "findByClientId" | "add">;
  clientIdentityPort: ClientIdentityPort;
  coachingEndedPort: CoachingEndedPort;
  clientCoachingPort: ClientCoachingPort;
  libraryExercisesPort: LibraryExercisesPort;
  programIdsPort: ProgramIdsPort;
  clockPort: ClockPort;
};

export class StartProgramUseCase {
  constructor(private readonly options: StartProgramUseCaseOptions) {}

  async execute(command: StartProgramCommand): Promise<StartProgramResult> {
    const {
      clientIdentityPort,
      coachingEndedPort,
      clientCoachingPort,
      programStorePort,
    } = this.options;
    const client = await clientIdentityPort.find(command.clientId);

    if (!client) {
      return { status: "unknown-client" };
    }

    const coachingEnded = await coachingEndedPort.hasEnded(command.clientId);
    const clientCoaching = await clientCoachingPort.find(command.clientId);
    const program = await programStorePort.findByClientId(command.clientId);
    const eligibility = Program.eligibilityFor({
      client,
      coachingEnded,
      clientCoaching,
      program,
    });

    if (eligibility.status !== "eligible") {
      return { status: eligibility.status };
    }

    const setup = ProgramSetup.from(command.setup, eligibility.clientCoaching);

    if (setup.status === "invalid") {
      return setup;
    }

    return this.start({ command, setup: setup.setup });
  }

  private async start({
    command,
    setup,
  }: ProgramStart): Promise<StartProgramResult> {
    const {
      programStorePort,
      clientCoachingPort,
      libraryExercisesPort,
      programIdsPort,
      clockPort,
    } = this.options;
    const suggestions = new ProgramSuggestions({
      libraryExercises: await libraryExercisesPort.listFor(
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

    await clientCoachingPort.saveEquipment({
      clientId: command.clientId,
      equipment: setup.values.equipment,
    });

    return { status: "started" };
  }
}

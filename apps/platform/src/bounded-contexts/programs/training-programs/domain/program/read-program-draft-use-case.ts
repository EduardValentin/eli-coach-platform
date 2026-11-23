import type {
  CardioExercise,
  CardioExercisesPort,
} from "./cardio-exercises-port";
import type {
  ClientCoaching,
  ClientCoachingFacts,
  ClientCoachingPort,
} from "./client-coaching-port";
import type {
  ClientIdentity,
  ClientIdentityPort,
} from "./client-identity-port";
import type { CoachingEndedPort } from "./coaching-ended-port";
import type { Program } from "./program";
import { ProgramSetup } from "./program-setup";
import type { ProgramStorePort } from "./program-store-port";
import type { BlockSetup } from "./program-suggestions";
import type { DraftReading } from "./program-version";
import type { ClientLevel, ProgramLanguage } from "./vocabulary";

type ReadProgramDraftCommand = { clientId: string; coachAccountId: string };

export type ProgramDraftReading =
  | { status: "unknown-client" | "no-draft" }
  | { status: "no-program"; client: ClientIdentity }
  | {
      status: "draft";
      client: ClientIdentity;
      coachingEnded: boolean;
      level: ClientLevel;
      language: ProgramLanguage;
      draft: DraftReading;
      blockSetup: BlockSetup;
      cardioExercises: CardioExercise[];
    };

type ReadProgramDraftUseCaseOptions = {
  clientIdentityPort: ClientIdentityPort;
  coachingEndedPort: CoachingEndedPort;
  clientCoachingPort: Pick<ClientCoachingPort, "find">;
  cardioExercisesPort: CardioExercisesPort;
  programStorePort: Pick<ProgramStorePort, "findByClientId">;
};

type BlockSetupSources = {
  program: Program;
  draft: DraftReading;
  clientCoaching: ClientCoaching;
};

const UNAPPROVED_COACHING_FACTS: ClientCoachingFacts = {
  goal: null,
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: [],
};

export class ReadProgramDraftUseCase {
  constructor(private readonly options: ReadProgramDraftUseCaseOptions) {}

  async execute({
    clientId,
    coachAccountId,
  }: ReadProgramDraftCommand): Promise<ProgramDraftReading> {
    const {
      clientIdentityPort,
      coachingEndedPort,
      clientCoachingPort,
      cardioExercisesPort,
      programStorePort,
    } = this.options;
    const client = await clientIdentityPort.find(clientId);

    if (!client) {
      return { status: "unknown-client" };
    }

    const program = await programStorePort.findByClientId(clientId);

    if (!program) {
      return { status: "no-program", client };
    }

    const draft = program.draft();

    if (!draft) {
      return { status: "no-draft" };
    }

    return {
      status: "draft",
      client,
      coachingEnded: await coachingEndedPort.hasEnded(clientId),
      level: program.level,
      language: program.language,
      draft,
      blockSetup: this.blockSetupOf({
        program,
        draft,
        clientCoaching: await clientCoachingPort.find(clientId),
      }),
      cardioExercises: await cardioExercisesPort.listFor(coachAccountId),
    };
  }

  // A new block is set up as her setup would set it up today, in the
  // program's language and the plan's split.
  private blockSetupOf({
    program,
    draft,
    clientCoaching,
  }: BlockSetupSources): BlockSetup {
    const { answers } = clientCoaching;
    const startingValues = ProgramSetup.startingValues(
      answers.status === "approved"
        ? answers.coachingFacts
        : UNAPPROVED_COACHING_FACTS,
    );

    return {
      splitShape:
        draft.content.plan.blocks[0]?.split.shape ?? startingValues.splitShape,
      trainingDays: startingValues.trainingDays,
      sessionMinutes: startingValues.sessionMinutes,
      dailySteps: startingValues.dailySteps,
      language: program.language,
    };
  }
}

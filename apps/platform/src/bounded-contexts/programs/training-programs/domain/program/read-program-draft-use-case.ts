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
import { LibraryEquipment } from "./library-equipment";
import type { Equipment, LibraryExercise } from "./library-exercise";
import type { LibraryExercisesPort } from "./library-exercises-port";
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
      startingBlockSetup: BlockSetup;
      libraryExercises: LibraryExercise[];
      clientProfile: ClientCoachingFacts | null;
      libraryEquipment: Equipment[];
    };

type ReadProgramDraftUseCaseOptions = {
  clientIdentityPort: ClientIdentityPort;
  coachingEndedPort: CoachingEndedPort;
  clientCoachingPort: Pick<ClientCoachingPort, "find">;
  libraryExercisesPort: LibraryExercisesPort;
  programStorePort: Pick<ProgramStorePort, "findByClientId">;
};

const UNAPPROVED_COACHING_FACTS: ClientCoachingFacts = {
  goal: null,
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: [],
  trainingPlace: null,
  limitations: "",
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
      libraryExercisesPort,
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

    const clientProfile = this.approvedFactsOf(
      await clientCoachingPort.find(clientId),
    );

    return {
      status: "draft",
      client,
      coachingEnded: await coachingEndedPort.hasEnded(clientId),
      level: program.level,
      language: program.language,
      draft,
      startingBlockSetup: this.startingBlockSetupOf(program, clientProfile),
      libraryExercises: await libraryExercisesPort.listFor(coachAccountId),
      clientProfile,
      libraryEquipment: LibraryEquipment.coveredBy(
        clientProfile?.equipment ?? [],
      ),
    };
  }

  private approvedFactsOf({
    answers,
  }: ClientCoaching): ClientCoachingFacts | null {
    return answers.status === "approved" ? answers.coachingFacts : null;
  }

  private startingBlockSetupOf(
    program: Program,
    clientProfile: ClientCoachingFacts | null,
  ): BlockSetup {
    const { splitShape, trainingDays, sessionMinutes, dailySteps } =
      ProgramSetup.startingValues(clientProfile ?? UNAPPROVED_COACHING_FACTS);

    return {
      splitShape,
      trainingDays,
      sessionMinutes,
      dailySteps,
      language: program.language,
    };
  }
}

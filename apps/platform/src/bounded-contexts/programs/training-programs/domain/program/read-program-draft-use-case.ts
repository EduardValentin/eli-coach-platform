import type {
  ClientIdentity,
  ClientIdentityPort,
} from "./client-identity-port";
import type { CoachingEndedPort } from "./coaching-ended-port";
import type { ProgramStorePort } from "./program-store-port";
import type { DraftReading } from "./program-version";
import type { ClientLevel, ProgramLanguage } from "./vocabulary";

type ReadProgramDraftCommand = { clientId: string };

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
    };

type ReadProgramDraftUseCaseOptions = {
  clientIdentityPort: ClientIdentityPort;
  coachingEndedPort: CoachingEndedPort;
  programStorePort: Pick<ProgramStorePort, "findByClientId">;
};

export class ReadProgramDraftUseCase {
  constructor(private readonly options: ReadProgramDraftUseCaseOptions) {}

  async execute({
    clientId,
  }: ReadProgramDraftCommand): Promise<ProgramDraftReading> {
    const { clientIdentityPort, coachingEndedPort, programStorePort } =
      this.options;
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
    };
  }
}

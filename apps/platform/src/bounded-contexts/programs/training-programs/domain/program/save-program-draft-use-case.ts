import type { ClockPort } from "../clock-port";
import type { ClientIdentityPort } from "./client-identity-port";
import type { ProgramContent } from "./program-content";
import type { ProgramStorePort } from "./program-store-port";
import type { ClientLevel, ProgramLanguage } from "./vocabulary";

type SaveProgramDraftCommand = {
  clientId: string;
  content: ProgramContent;
  level: ClientLevel;
  language: ProgramLanguage;
  expectedUpdatedAt: Date;
};

export type SaveProgramDraftResult =
  | { status: "saved"; updatedAt: Date }
  | {
      status:
        | "changed-elsewhere"
        | "not-a-draft"
        | "not-well-formed"
        | "no-program"
        | "unknown-client";
    };

type SaveProgramDraftUseCaseOptions = {
  clientIdentityPort: ClientIdentityPort;
  programStorePort: Pick<ProgramStorePort, "findByClientId" | "saveDraft">;
  clockPort: ClockPort;
};

export class SaveProgramDraftUseCase {
  constructor(private readonly options: SaveProgramDraftUseCaseOptions) {}

  async execute({
    clientId,
    expectedUpdatedAt,
    ...save
  }: SaveProgramDraftCommand): Promise<SaveProgramDraftResult> {
    const { clientIdentityPort, programStorePort, clockPort } = this.options;

    if (!(await clientIdentityPort.find(clientId))) {
      return { status: "unknown-client" };
    }

    const program = await programStorePort.findByClientId(clientId);

    if (!program) {
      return { status: "no-program" };
    }

    const at = clockPort.now();
    const saving = program.saveDraft({ ...save, at });

    if (saving.status !== "saved") {
      return saving;
    }

    const outcome = await programStorePort.saveDraft({
      program: saving.program,
      expectedUpdatedAt,
    });

    return outcome === "saved"
      ? { status: "saved", updatedAt: at }
      : { status: outcome };
  }
}

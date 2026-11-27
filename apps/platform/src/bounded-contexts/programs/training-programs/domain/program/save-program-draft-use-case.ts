import type { ClockPort } from "../clock-port";
import type { ClientIdentityPort } from "./client-identity-port";
import type { ExerciseUsagePort } from "./exercise-usage-port";
import type { LibraryExercisesPort } from "./library-exercises-port";
import type { ProgramContent } from "./program-content";
import { ProgramExerciseIds } from "./program-exercise-ids";
import type { ProgramStorePort } from "./program-store-port";
import type { ClientLevel, ProgramLanguage } from "./vocabulary";

type SaveProgramDraftCommand = {
  coachAccountId: string;
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
        | "level-and-language-fixed"
        | "not-well-formed"
        | "no-program"
        | "unknown-client";
    };

type SaveProgramDraftUseCaseOptions = {
  clientIdentityPort: ClientIdentityPort;
  programStorePort: Pick<ProgramStorePort, "findByClientId" | "saveDraft">;
  libraryExercisesPort: LibraryExercisesPort;
  exerciseUsagePort: ExerciseUsagePort;
  clockPort: ClockPort;
};

export class SaveProgramDraftUseCase {
  constructor(private readonly options: SaveProgramDraftUseCaseOptions) {}

  async execute({
    coachAccountId,
    clientId,
    expectedUpdatedAt,
    ...changes
  }: SaveProgramDraftCommand): Promise<SaveProgramDraftResult> {
    const {
      clientIdentityPort,
      programStorePort,
      exerciseUsagePort,
      clockPort,
    } = this.options;

    if (!(await clientIdentityPort.find(clientId))) {
      return { status: "unknown-client" };
    }

    const program = await programStorePort.findByClientId(clientId);

    if (!program) {
      return { status: "no-program" };
    }

    const at = clockPort.now();
    const saving = program.saveDraft({ ...changes, at });

    if (saving.status !== "saved") {
      return saving;
    }
    if (!(await this.namesOnlyHerExercises(changes.content, coachAccountId))) {
      return { status: "not-well-formed" };
    }

    const outcome = await programStorePort.saveDraft({
      program: saving.program,
      expectedUpdatedAt,
    });

    if (outcome !== "saved") {
      return { status: outcome };
    }

    const usage = saving.program.draftUsage(coachAccountId);

    if (usage) {
      await exerciseUsagePort.recordVersionUsage(usage);
    }

    return { status: "saved", updatedAt: at };
  }

  private async namesOnlyHerExercises(
    content: ProgramContent,
    coachAccountId: string,
  ): Promise<boolean> {
    const herExerciseIds = new Set(
      (await this.options.libraryExercisesPort.listFor(coachAccountId)).map(
        (exercise) => exercise.id,
      ),
    );

    return ProgramExerciseIds.usedBy(content).every((id) =>
      herExerciseIds.has(id),
    );
  }
}

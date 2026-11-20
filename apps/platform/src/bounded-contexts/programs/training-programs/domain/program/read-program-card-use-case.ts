import type { ClientCoachingPort, ClientGender } from "./client-coaching-port";
import { Program } from "./program";
import type { ProgramStorePort } from "./program-store-port";
import type { DraftSummary } from "./program-version";

type ReadProgramCardCommand = { clientId: string };

export type ProgramCardReading =
  | { status: "unknown-client" }
  | {
      status: "waiting" | "ready-to-build" | "coaching-ended";
      gender: ClientGender;
    }
  | { status: "program"; gender: ClientGender; draft: DraftSummary | null };

type ReadProgramCardUseCaseOptions = {
  clientCoachingPort: Pick<ClientCoachingPort, "find">;
  programStorePort: Pick<ProgramStorePort, "findByClientId">;
};

export class ReadProgramCardUseCase {
  constructor(private readonly options: ReadProgramCardUseCaseOptions) {}

  async execute({
    clientId,
  }: ReadProgramCardCommand): Promise<ProgramCardReading> {
    const { clientCoachingPort, programStorePort } = this.options;
    const clientCoaching = await clientCoachingPort.find(clientId);
    const eligibility = Program.eligibilityFor({
      clientCoaching,
      program:
        clientCoaching && (await programStorePort.findByClientId(clientId)),
    });

    if (eligibility.status === "unknown-client") {
      return { status: "unknown-client" };
    }

    const { gender } = eligibility.clientCoaching;

    switch (eligibility.status) {
      case "has-program":
        return {
          status: "program",
          gender,
          draft: eligibility.program.draftSummary(),
        };
      case "coaching-ended":
        return { status: "coaching-ended", gender };
      case "not-approved":
        return { status: "waiting", gender };
      case "eligible":
        return { status: "ready-to-build", gender };
    }
  }
}

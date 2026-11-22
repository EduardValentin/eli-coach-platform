import type { ClientCoachingPort } from "./client-coaching-port";
import type { ClientGender, ClientIdentityPort } from "./client-identity-port";
import type { CoachingEndedPort } from "./coaching-ended-port";
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
  | {
      status: "program";
      gender: ClientGender;
      coachingEnded: boolean;
      draft: DraftSummary | null;
    };

type ReadProgramCardUseCaseOptions = {
  clientIdentityPort: ClientIdentityPort;
  coachingEndedPort: CoachingEndedPort;
  clientCoachingPort: Pick<ClientCoachingPort, "find">;
  programStorePort: Pick<ProgramStorePort, "findByClientId">;
};

export class ReadProgramCardUseCase {
  constructor(private readonly options: ReadProgramCardUseCaseOptions) {}

  async execute({
    clientId,
  }: ReadProgramCardCommand): Promise<ProgramCardReading> {
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

    const { gender } = eligibility.client;

    switch (eligibility.status) {
      case "has-program":
        return {
          status: "program",
          gender,
          coachingEnded: eligibility.coachingEnded,
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

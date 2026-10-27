import type { AdmittedClients } from "./admitted-clients";
import {
  CoachingStanding,
  type CoachingStandingSnapshot,
} from "./coaching-standing";

type RecordCoachingStandingCommand = {
  clientId: string;
  standing: CoachingStandingSnapshot;
};

export class RecordCoachingStandingUseCase {
  constructor(
    private readonly options: {
      clients: Pick<AdmittedClients, "recordStanding">;
    },
  ) {}

  async execute(command: RecordCoachingStandingCommand): Promise<void> {
    await this.options.clients.recordStanding({
      clientId: command.clientId,
      standing: CoachingStanding.of(command.standing),
    });
  }
}

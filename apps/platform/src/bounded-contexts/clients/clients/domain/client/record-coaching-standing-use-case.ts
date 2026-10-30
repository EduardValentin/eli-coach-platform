import type { AdmittedClientsPort } from "./admitted-clients-port";
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
      clients: Pick<AdmittedClientsPort, "recordStanding">;
    },
  ) {}

  async execute(command: RecordCoachingStandingCommand): Promise<void> {
    await this.options.clients.recordStanding({
      clientId: command.clientId,
      standing: CoachingStanding.of(command.standing),
    });
  }
}

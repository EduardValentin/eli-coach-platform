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
      admittedClientsPort: Pick<AdmittedClientsPort, "recordStanding">;
    },
  ) {}

  async execute(command: RecordCoachingStandingCommand): Promise<void> {
    await this.options.admittedClientsPort.recordStanding({
      clientId: command.clientId,
      standing: CoachingStanding.of(command.standing),
    });
  }
}

import type { CoachingStanding } from "./coaching-standing";

export interface CoachingStandingWriterPort {
  record(input: {
    clientId: string;
    standing: CoachingStanding;
  }): Promise<void>;
}

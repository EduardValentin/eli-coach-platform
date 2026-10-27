import type { CoachingStanding } from "./coaching-standing";

export interface CoachingStandingWriter {
  record(input: {
    clientId: string;
    standing: CoachingStanding;
  }): Promise<void>;
}

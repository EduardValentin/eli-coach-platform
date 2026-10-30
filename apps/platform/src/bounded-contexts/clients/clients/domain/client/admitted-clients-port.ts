import type { Client } from "./client";
import type { CoachingStanding } from "./coaching-standing";

export type ClientAdmission = "admitted" | "call_already_has_client";

export interface AdmittedClientsPort {
  admit(admission: {
    client: Client;
    standing: CoachingStanding;
  }): Promise<ClientAdmission>;
  recordStanding(input: {
    clientId: string;
    standing: CoachingStanding;
  }): Promise<void>;
}

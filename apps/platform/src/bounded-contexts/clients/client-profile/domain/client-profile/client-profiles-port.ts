import type { ClientProfile } from "./client-profile";

export type ClientProfileSave = {
  profile: ClientProfile;
  expectedUpdatedAt: Date;
};

export type ClientProfileSaveOutcome = "saved" | "changed-meanwhile";

export interface ClientProfilesPort {
  findByClientId(clientId: string): Promise<ClientProfile | null>;
  saveSharedFacts(save: ClientProfileSave): Promise<ClientProfileSaveOutcome>;
  saveCoachFacts(save: ClientProfileSave): Promise<ClientProfileSaveOutcome>;
  recordPhotoConsent(clientId: string, at: Date): Promise<void>;
}

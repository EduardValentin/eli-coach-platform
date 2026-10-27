import type { ClientGender, ClientPrimaryGoal } from "../client";

export type ClientCall = {
  startsAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: ClientGender;
  country: string;
  phone: string | null;
  primaryGoal: ClientPrimaryGoal;
  notes: string | null;
};

export interface ClientCalls {
  callOf(callId: string): Promise<ClientCall | null>;
}

import type { CallerGender, CallerGoal } from "../caller";

export type SalesCall = {
  id: string;
  firstName: string;
  lastName: string;
  visitorEmail: string;
  dateOfBirth: string;
  gender: CallerGender;
  primaryGoal: CallerGoal;
  country: string;
  phone: string | null;
  visitorTimeZone: string;
  endsAt: Date;
};

export interface EndedCalls {
  findById(callId: string): Promise<SalesCall | null>;
}

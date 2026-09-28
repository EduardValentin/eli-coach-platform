import type { VisitorGender } from "../assessment-call";

export type OnboardingClient = {
  clientId: string;
  gender: VisitorGender;
  dateOfBirth: string;
};

export interface OnboardingClients {
  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null>;
}

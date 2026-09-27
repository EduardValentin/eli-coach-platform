export interface PaidClientAdmission {
  admit(input: { clientId: string }): Promise<void>;
}

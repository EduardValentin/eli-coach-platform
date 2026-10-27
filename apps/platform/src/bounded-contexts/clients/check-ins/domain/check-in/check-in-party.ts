export const CHECK_IN_PARTIES = ["client", "coach"] as const;

export type CheckInParty = (typeof CHECK_IN_PARTIES)[number];

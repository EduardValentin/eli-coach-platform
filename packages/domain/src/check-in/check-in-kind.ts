import type { CheckInParty } from "./check-in-party";

export const CHECK_IN_KINDS = ["ad_hoc"] as const;

export type CheckInKind = (typeof CHECK_IN_KINDS)[number];

export class CheckInKindPolicy {
  private constructor(
    private readonly approvedCancellers: readonly CheckInParty[],
  ) {}

  static cancelledOnceApprovedBy(
    parties: readonly CheckInParty[],
  ): CheckInKindPolicy {
    return new CheckInKindPolicy(parties);
  }

  mayCancelApproved(party: CheckInParty): boolean {
    return this.approvedCancellers.includes(party);
  }
}

export const CHECK_IN_KIND_POLICIES: Record<CheckInKind, CheckInKindPolicy> = {
  ad_hoc: CheckInKindPolicy.cancelledOnceApprovedBy(["client", "coach"]),
};

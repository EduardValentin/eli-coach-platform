import type { CheckInParty } from "./check-in-party";

export const CHECK_IN_KINDS = ["ad_hoc", "recurring"] as const;

export type CheckInKind = (typeof CHECK_IN_KINDS)[number];

type CheckInKindInitialStatus = "pending" | "approved";

export class CheckInKindPolicy {
  private constructor(
    private readonly initial: CheckInKindInitialStatus,
    private readonly approvedCancellers: readonly CheckInParty[],
  ) {}

  static cancelledOnceApprovedBy(
    parties: readonly CheckInParty[],
  ): CheckInKindPolicy {
    return new CheckInKindPolicy("pending", parties);
  }

  static approvedOnCreationCancelledBy(
    parties: readonly CheckInParty[],
  ): CheckInKindPolicy {
    return new CheckInKindPolicy("approved", parties);
  }

  initialStatus(): CheckInKindInitialStatus {
    return this.initial;
  }

  mayCancelApproved(party: CheckInParty): boolean {
    return this.approvedCancellers.includes(party);
  }
}

export const CHECK_IN_KIND_POLICIES: Record<CheckInKind, CheckInKindPolicy> = {
  ad_hoc: CheckInKindPolicy.cancelledOnceApprovedBy(["client", "coach"]),
  recurring: CheckInKindPolicy.approvedOnCreationCancelledBy(["coach"]),
};

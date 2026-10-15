import type { CheckInParty } from "./check-in-party";

export const CHECK_IN_KINDS = ["ad_hoc", "recurring"] as const;

export type CheckInKind = (typeof CHECK_IN_KINDS)[number];

type CheckInKindInitialStatus = "pending" | "approved";

type ApprovedCheckInCanceller = {
  party: CheckInParty;
  initiatedBy: CheckInParty;
};

type ApprovedCancellationRule = (
  canceller: ApprovedCheckInCanceller,
) => boolean;

export class CheckInKindPolicy {
  private constructor(
    private readonly initial: CheckInKindInitialStatus,
    private readonly approvedCancellation: ApprovedCancellationRule,
  ) {}

  static cancelledOnceApprovedByRequester(): CheckInKindPolicy {
    return new CheckInKindPolicy(
      "pending",
      ({ party, initiatedBy }) => party === initiatedBy,
    );
  }

  static approvedOnCreationCancelledBy(
    parties: readonly CheckInParty[],
  ): CheckInKindPolicy {
    return new CheckInKindPolicy("approved", ({ party }) =>
      parties.includes(party),
    );
  }

  initialStatus(): CheckInKindInitialStatus {
    return this.initial;
  }

  mayCancelApproved(canceller: ApprovedCheckInCanceller): boolean {
    return this.approvedCancellation(canceller);
  }
}

export const CHECK_IN_KIND_POLICIES: Record<CheckInKind, CheckInKindPolicy> = {
  ad_hoc: CheckInKindPolicy.cancelledOnceApprovedByRequester(),
  recurring: CheckInKindPolicy.approvedOnCreationCancelledBy(["coach"]),
};

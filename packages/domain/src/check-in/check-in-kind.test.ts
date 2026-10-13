import { describe, expect, it } from "vitest";

import { CHECK_IN_KIND_POLICIES, CheckInKindPolicy } from "./check-in-kind";

describe("CheckInKindPolicy", () => {
  it("lets only the parties it names cancel once approved", () => {
    // arrange
    const coachOnly = CheckInKindPolicy.cancelledOnceApprovedBy(["coach"]);

    // act
    const rights = {
      coach: coachOnly.mayCancelApproved("coach"),
      client: coachOnly.mayCancelApproved("client"),
    };

    // assert
    expect(rights).toEqual({ coach: true, client: false });
  });

  it("starts a check-in waiting for an answer when it is approved by answering", () => {
    // arrange
    const answered = CheckInKindPolicy.cancelledOnceApprovedBy(["coach"]);

    // act
    const status = answered.initialStatus();

    // assert
    expect(status).toBe("pending");
  });

  it("starts a check-in approved when it is approved on creation, cancelled only by the parties it names", () => {
    // arrange
    const approvedOnCreation = CheckInKindPolicy.approvedOnCreationCancelledBy([
      "coach",
    ]);

    // act
    const policy = {
      status: approvedOnCreation.initialStatus(),
      coach: approvedOnCreation.mayCancelApproved("coach"),
      client: approvedOnCreation.mayCancelApproved("client"),
    };

    // assert
    expect(policy).toEqual({ status: "approved", coach: true, client: false });
  });
});

describe("CHECK_IN_KIND_POLICIES", () => {
  it("lets both parties cancel an approved ad-hoc check-in that started waiting for an answer", () => {
    // arrange
    const adHoc = CHECK_IN_KIND_POLICIES.ad_hoc;

    // act
    const policy = {
      status: adHoc.initialStatus(),
      coach: adHoc.mayCancelApproved("coach"),
      client: adHoc.mayCancelApproved("client"),
    };

    // assert
    expect(policy).toEqual({ status: "pending", coach: true, client: true });
  });

  it("creates a recurring check-in approved and lets only the coach cancel it", () => {
    // arrange
    const recurring = CHECK_IN_KIND_POLICIES.recurring;

    // act
    const policy = {
      status: recurring.initialStatus(),
      coach: recurring.mayCancelApproved("coach"),
      client: recurring.mayCancelApproved("client"),
    };

    // assert
    expect(policy).toEqual({ status: "approved", coach: true, client: false });
  });
});

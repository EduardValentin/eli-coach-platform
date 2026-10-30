import { describe, expect, it } from "vitest";

import { CHECK_IN_KIND_POLICIES, CheckInKindPolicy } from "./check-in-kind";

describe("CheckInKindPolicy", () => {
  it("lets only the party who requested the check-in cancel it once approved", () => {
    // arrange
    const byRequester = CheckInKindPolicy.cancelledOnceApprovedByRequester();

    // act
    const rights = {
      clientOnHers: byRequester.mayCancelApproved({
        party: "client",
        initiatedBy: "client",
      }),
      coachOnHers: byRequester.mayCancelApproved({
        party: "coach",
        initiatedBy: "client",
      }),
      coachOnTheCoachs: byRequester.mayCancelApproved({
        party: "coach",
        initiatedBy: "coach",
      }),
      clientOnTheCoachs: byRequester.mayCancelApproved({
        party: "client",
        initiatedBy: "coach",
      }),
    };

    // assert
    expect(rights).toEqual({
      clientOnHers: true,
      coachOnHers: false,
      coachOnTheCoachs: true,
      clientOnTheCoachs: false,
    });
  });

  it("starts a check-in waiting for an answer when the requester alone cancels it once approved", () => {
    // arrange
    const byRequester = CheckInKindPolicy.cancelledOnceApprovedByRequester();

    // act
    const status = byRequester.initialStatus();

    // assert
    expect(status).toBe("pending");
  });

  it("starts a check-in approved when it is approved on creation, cancelled only by the parties it names whoever requested it", () => {
    // arrange
    const approvedOnCreation = CheckInKindPolicy.approvedOnCreationCancelledBy([
      "coach",
    ]);

    // act
    const policy = {
      status: approvedOnCreation.initialStatus(),
      coach: approvedOnCreation.mayCancelApproved({
        party: "coach",
        initiatedBy: "client",
      }),
      client: approvedOnCreation.mayCancelApproved({
        party: "client",
        initiatedBy: "client",
      }),
    };

    // assert
    expect(policy).toEqual({ status: "approved", coach: true, client: false });
  });
});

describe("CHECK_IN_KIND_POLICIES", () => {
  it("starts an ad-hoc check-in waiting for an answer and lets only its requester cancel it once approved", () => {
    // arrange
    const adHoc = CHECK_IN_KIND_POLICIES.ad_hoc;

    // act
    const policy = {
      status: adHoc.initialStatus(),
      requester: adHoc.mayCancelApproved({
        party: "client",
        initiatedBy: "client",
      }),
      otherParty: adHoc.mayCancelApproved({
        party: "coach",
        initiatedBy: "client",
      }),
    };

    // assert
    expect(policy).toEqual({
      status: "pending",
      requester: true,
      otherParty: false,
    });
  });

  it("creates a recurring check-in approved and lets only the coach cancel it", () => {
    // arrange
    const recurring = CHECK_IN_KIND_POLICIES.recurring;

    // act
    const policy = {
      status: recurring.initialStatus(),
      coach: recurring.mayCancelApproved({
        party: "coach",
        initiatedBy: "coach",
      }),
      client: recurring.mayCancelApproved({
        party: "client",
        initiatedBy: "coach",
      }),
    };

    // assert
    expect(policy).toEqual({ status: "approved", coach: true, client: false });
  });
});

import { describe, expect, it, vi } from "vitest";

import { AccountInvitation } from "./account-invitation";
import { AccountInvitationGate } from "./account-invitation-gate";

const NOW = new Date("2026-09-27T10:00:00.000Z");
const EARLIER = new Date("2026-09-26T10:00:00.000Z");
const EXPIRES_AT = new Date("2026-10-26T10:00:00.000Z");

function invitation(
  overrides: Partial<Parameters<typeof AccountInvitation.reconstitute>[0]> = {},
): AccountInvitation {
  return AccountInvitation.reconstitute({
    ...AccountInvitation.issue({
      id: "invitation-1",
      email: "ana@example.com",
      role: "CLIENT",
      tokenHash: "a".repeat(64),
      sentAt: EARLIER,
    }).toSnapshot(),
    ...overrides,
  });
}

function gateDependencies(options: {
  invitationIdForSubject?: string | null;
  found: AccountInvitation | null;
  now?: Date;
}) {
  return {
    clockPort: { now: () => options.now ?? NOW },
    accountInvitationsPort: {
      findById: vi.fn().mockResolvedValue(options.found),
      accept: vi.fn().mockResolvedValue("accepted"),
    },
    invitationReferencesPort: {
      invitationIdOf: vi
        .fn()
        .mockResolvedValue(
          options.invitationIdForSubject === undefined
            ? "invitation-1"
            : options.invitationIdForSubject,
        ),
    },
  };
}

describe("AccountInvitationGate", () => {
  it("accepts a pending invitation for the subject that carries it", async () => {
    // arrange
    const dependencies = gateDependencies({ found: invitation() });
    const gate = new AccountInvitationGate(dependencies);

    // act
    const role = await gate.admit("user_ana");

    // assert
    expect(role).toBe("CLIENT");
    expect(
      dependencies.invitationReferencesPort.invitationIdOf,
    ).toHaveBeenCalledWith("user_ana");
    expect(dependencies.accountInvitationsPort.findById).toHaveBeenCalledWith(
      "invitation-1",
    );
    expect(dependencies.accountInvitationsPort.accept).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      authSubjectId: "user_ana",
      at: NOW,
    });
  });

  it("refuses a subject that carries no invitation", async () => {
    // arrange
    const dependencies = gateDependencies({
      invitationIdForSubject: null,
      found: invitation(),
    });
    const gate = new AccountInvitationGate(dependencies);

    // act
    const role = await gate.admit("user_stranger");

    // assert
    expect(role).toBeNull();
    expect(dependencies.accountInvitationsPort.findById).not.toHaveBeenCalled();
    expect(dependencies.accountInvitationsPort.accept).not.toHaveBeenCalled();
  });

  it.each([
    ["matches no invitation", null],
    [
      "holds an invitation for a role other than CLIENT",
      invitation({ role: "COACH" }),
    ],
  ] as const)(
    "refuses a subject whose invitation id %s",
    async (_label, found) => {
      // arrange
      const dependencies = gateDependencies({ found });
      const gate = new AccountInvitationGate(dependencies);

      // act
      const role = await gate.admit("user_ana");

      // assert
      expect(role).toBeNull();
      expect(dependencies.accountInvitationsPort.accept).not.toHaveBeenCalled();
    },
  );

  it("refuses an expired invitation that was never used", async () => {
    // arrange
    const dependencies = gateDependencies({
      found: invitation(),
      now: EXPIRES_AT,
    });
    const gate = new AccountInvitationGate(dependencies);

    // act
    const role = await gate.admit("user_ana");

    // assert
    expect(role).toBeNull();
    expect(dependencies.accountInvitationsPort.accept).not.toHaveBeenCalled();
  });

  it("accepts again without writing when the same subject replays an invitation it accepted", async () => {
    // arrange
    const dependencies = gateDependencies({
      found: invitation({
        acceptedAt: EARLIER,
        acceptedByAuthSubjectId: "user_ana",
      }),
      now: new Date("2026-11-30T10:00:00.000Z"),
    });
    const gate = new AccountInvitationGate(dependencies);

    // act
    const role = await gate.admit("user_ana");

    // assert
    expect(role).toBe("CLIENT");
    expect(dependencies.accountInvitationsPort.accept).not.toHaveBeenCalled();
  });

  it("refuses a second subject presenting an invitation another subject accepted", async () => {
    // arrange
    const dependencies = gateDependencies({
      found: invitation({
        acceptedAt: EARLIER,
        acceptedByAuthSubjectId: "user_ana",
      }),
    });
    const gate = new AccountInvitationGate(dependencies);

    // act
    const role = await gate.admit("user_other");

    // assert
    expect(role).toBeNull();
    expect(dependencies.accountInvitationsPort.accept).not.toHaveBeenCalled();
  });

  it.each([
    ["accepts when the winning write was its own", "user_ana", "CLIENT"],
    ["refuses when another subject won the write", "user_other", null],
  ] as const)(
    "re-reads after losing the race and %s",
    async (_label, winner, expected) => {
      // arrange
      const dependencies = gateDependencies({ found: invitation() });
      dependencies.accountInvitationsPort.accept.mockResolvedValue("raced");
      dependencies.accountInvitationsPort.findById
        .mockResolvedValueOnce(invitation())
        .mockResolvedValueOnce(
          invitation({ acceptedAt: NOW, acceptedByAuthSubjectId: winner }),
        );
      const gate = new AccountInvitationGate(dependencies);

      // act
      const role = await gate.admit("user_ana");

      // assert
      expect(role).toBe(expected);
      expect(
        dependencies.accountInvitationsPort.findById,
      ).toHaveBeenCalledTimes(2);
    },
  );
});

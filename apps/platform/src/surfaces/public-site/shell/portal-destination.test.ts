import { describe, expect, it } from "vitest";

import { resolvePortalDestination } from "./portal-destination";

describe("resolvePortalDestination", () => {
  it("points the coach at the coach portal", () => {
    // arrange
    const session = { standing: null, role: "COACH" } as const;

    // act
    const destination = resolvePortalDestination(session);

    // assert
    expect(destination).toEqual({ href: "/coach", label: "Coach Portal" });
  });

  it("points a client who has not seen her welcome at the welcome screen", () => {
    // arrange
    const session = {
      standing: { step: "welcome", coaching: "active" },
      role: "CLIENT",
    } as const;

    // act
    const destination = resolvePortalDestination(session);

    // assert
    expect(destination).toEqual({
      href: "/client/welcome",
      label: "Finish your onboarding",
    });
  });

  it("points a client who has seen her welcome at onboarding", () => {
    // arrange
    const session = {
      standing: { step: "onboarding", coaching: "active" },
      role: "CLIENT",
    } as const;

    // act
    const destination = resolvePortalDestination(session);

    // assert
    expect(destination).toEqual({
      href: "/client/onboarding",
      label: "Finish your onboarding",
    });
  });

  it("points a client who has sent her onboarding at the client portal", () => {
    // arrange
    const session = {
      standing: { step: "submitted", coaching: "active" },
      role: "CLIENT",
    } as const;

    // act
    const destination = resolvePortalDestination(session);

    // assert
    expect(destination).toEqual({ href: "/client", label: "Client Portal" });
  });

  it("points a client account with no journey at the client portal", () => {
    // arrange
    const session = { standing: null, role: "CLIENT" } as const;

    // act
    const destination = resolvePortalDestination(session);

    // assert
    expect(destination).toEqual({ href: "/client", label: "Client Portal" });
  });

  it("points a client whose coaching has ended at the client portal, which sends her to the ended page", () => {
    // arrange
    const session = {
      standing: { step: "welcome", coaching: "ended" },
      role: "CLIENT",
    } as const;

    // act
    const destination = resolvePortalDestination(session);

    // assert
    expect(destination).toEqual({ href: "/client", label: "Client Portal" });
  });
});

import { describe, expect, it } from "vitest";

import {
  CLIENT_PORTAL_ROUTE_SEGMENT,
  COACH_PORTAL_ROUTE_SEGMENT,
  invitationPath,
  portalForPathname,
} from "./paths";

describe("invitationPath", () => {
  it("carries the invitation token in the fragment so it never reaches the server", () => {
    // arrange
    const token = "abc-DEF_123";

    // act
    const path = invitationPath({ token });

    // assert
    expect(path).toBe("/invitation#abc-DEF_123");
  });
});

describe("portalForPathname", () => {
  it("names the coach portal for a path inside it", () => {
    // arrange
    const pathname = "/coach/settings";

    // act
    const portal = portalForPathname(pathname);

    // assert
    expect(portal).toBe(COACH_PORTAL_ROUTE_SEGMENT);
  });

  it("names the client portal for a path inside it", () => {
    // arrange
    const pathname = "/client";

    // act
    const portal = portalForPathname(pathname);

    // assert
    expect(portal).toBe(CLIENT_PORTAL_ROUTE_SEGMENT);
  });

  it("names no portal for a public path", () => {
    // arrange
    const pathname = "/store/coaching";

    // act
    const portal = portalForPathname(pathname);

    // assert
    expect(portal).toBeUndefined();
  });
});

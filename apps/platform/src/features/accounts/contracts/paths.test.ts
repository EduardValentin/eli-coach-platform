import { describe, expect, it } from "vitest";

import {
  CLIENT_PORTAL_ROUTE_SEGMENT,
  COACH_PORTAL_ROUTE_SEGMENT,
  portalForPathname,
} from "./paths";

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

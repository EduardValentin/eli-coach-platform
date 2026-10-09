import { matchPath } from "react-router";
import { describe, expect, it } from "vitest";

import {
  CHECK_IN_JOIN_ROUTE_SEGMENT,
  CHECK_INS_API_PATHS,
  CLIENT_CHECK_INS_PATH,
  clientCheckInJoinPath,
  COACH_CHECK_INS_PATH,
  coachCheckInJoinPath,
} from "./paths";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";

describe("check-ins paths", () => {
  it("links the client to the join route the client portal registers", () => {
    // arrange
    const link = clientCheckInJoinPath(CHECK_IN_ID);

    // act
    const match = matchPath(`/client/${CHECK_IN_JOIN_ROUTE_SEGMENT}`, link);

    // assert
    expect(match?.params.checkInId).toBe(CHECK_IN_ID);
  });

  it("links the coach to the join route the coach portal registers", () => {
    // arrange
    const link = coachCheckInJoinPath(CHECK_IN_ID);

    // act
    const match = matchPath(`/coach/${CHECK_IN_JOIN_ROUTE_SEGMENT}`, link);

    // assert
    expect(match?.params.checkInId).toBe(CHECK_IN_ID);
  });

  it("places each portal's Check-ins page under its portal", () => {
    // arrange
    const pages = [CLIENT_CHECK_INS_PATH, COACH_CHECK_INS_PATH];

    // act
    const portals = pages.map((page) => page.split("/")[1]);

    // assert
    expect(pages).toEqual(["/client/checkins", "/coach/checkins"]);
    expect(portals).toEqual(["client", "coach"]);
  });

  it("answers every write of one check-in under that check-in's own path", () => {
    // arrange
    const writes = [
      CHECK_INS_API_PATHS.withdrawal,
      CHECK_INS_API_PATHS.approval,
      CHECK_INS_API_PATHS.decline,
    ];

    // act
    const matched = writes.map(
      (write) =>
        matchPath(write, write.replace(":checkInId", CHECK_IN_ID))?.params
          .checkInId,
    );

    // assert
    expect(matched).toEqual([CHECK_IN_ID, CHECK_IN_ID, CHECK_IN_ID]);
  });
});

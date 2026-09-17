import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { sessionContext } from "./session-context.server";

describe("sessionContext", () => {
  it("reads as anonymous when no middleware resolved a session for the request", () => {
    // arrange
    const context = new RouterContextProvider();

    // act
    const session = context.get(sessionContext);

    // assert
    expect(session).toEqual({ kind: "anonymous" });
  });
});

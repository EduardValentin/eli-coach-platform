import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { accountContext } from "./account-context.server";

describe("accountContext", () => {
  it("reads as anonymous when no middleware resolved a session for the request", () => {
    // arrange
    const context = new RouterContextProvider();

    // act
    const session = context.get(accountContext);

    // assert
    expect(session).toEqual({ kind: "anonymous" });
  });
});

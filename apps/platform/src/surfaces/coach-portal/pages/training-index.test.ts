import { describe, expect, it } from "vitest";

import { loader } from "./training-index";

describe("training index", () => {
  it("redirects the hub root to the Client Plans tab", () => {
    // arrange
    let thrown: unknown;

    // act
    try {
      loader();
    } catch (error) {
      thrown = error;
    }

    // assert
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/coach/training/plans",
    );
  });
});

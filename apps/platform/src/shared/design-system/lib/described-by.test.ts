import { describe, expect, it } from "vitest";

import { describedByOf } from "./described-by";

describe("describedByOf", () => {
  it("joins the ids of the lines that describe a control in order", () => {
    // arrange
    const ids = ["weight-hint", "weight-message"];

    // act
    const describedBy = describedByOf(...ids);

    // assert
    expect(describedBy).toBe("weight-hint weight-message");
  });

  it("leaves out a line that is not shown", () => {
    // arrange
    const ids = [undefined, "weight-message"];

    // act
    const describedBy = describedByOf(...ids);

    // assert
    expect(describedBy).toBe("weight-message");
  });

  it("describes nothing when no line is shown", () => {
    // arrange
    const ids = [undefined, undefined];

    // act
    const describedBy = describedByOf(...ids);

    // assert
    expect(describedBy).toBeUndefined();
  });
});

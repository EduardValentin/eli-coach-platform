import { describe, expect, it } from "vitest";

import { resolvePrivateDownloadToken } from "./download-state";

describe("resolvePrivateDownloadToken", () => {
  it("treats a server-declared unavailable link as unavailable even when a fragment remains", () => {
    // arrange
    const location = {
      hash: "#private-token",
      search: "?unavailable=1",
    };

    // act
    const token = resolvePrivateDownloadToken(location);

    // assert
    expect(token).toBe("");
  });
});

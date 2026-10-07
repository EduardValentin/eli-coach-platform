import { describe, expect, it } from "vitest";

import {
  clientResourceFolderKey,
  clientResourceOriginalKey,
  clientResourcePageKey,
  clientResourceThumbnailKey,
} from "./client-resource-layout.server";

const OWNER = { clientId: "client-1", resourceId: "resource_A-9" };

describe("client resource layout", () => {
  it("places every file of a resource in the resource's folder under its client", () => {
    // arrange
    // act
    const keys = [
      clientResourceFolderKey(OWNER),
      clientResourceOriginalKey(OWNER),
      clientResourcePageKey(OWNER, 3),
      clientResourceThumbnailKey(OWNER),
    ];

    // assert
    expect(keys).toEqual([
      "client-1/resource_A-9",
      "client-1/resource_A-9/original",
      "client-1/resource_A-9/page-3",
      "client-1/resource_A-9/thumbnail",
    ]);
  });

  it.each([
    { clientId: "..", resourceId: "resource-1" },
    { clientId: ".", resourceId: "resource-1" },
    { clientId: "client-1", resourceId: "a/b" },
    { clientId: "client-1", resourceId: "a\\b" },
    { clientId: "", resourceId: "resource-1" },
    { clientId: "client-1", resourceId: "" },
    { clientId: "client 1", resourceId: "resource-1" },
  ])("refuses the owner %j", (owner) => {
    // arrange
    // act
    const keying = () => clientResourceOriginalKey(owner);

    // assert
    expect(keying).toThrow("Invalid client resource owner.");
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses the page number %d",
    (pageNumber) => {
      // arrange
      // act
      const keying = () => clientResourcePageKey(OWNER, pageNumber);

      // assert
      expect(keying).toThrow("Invalid client resource page number.");
    },
  );
});

import { describe, expect, it, vi } from "vitest";

import type { ClientResourceListing } from "~/features/client-resources/public/client-resources";
import type { ClientResourcesFeature } from "~/features/client-resources/server/client-resources-composition.server";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./resources-page";

const LISTING: ClientResourceListing = {
  status: "ready",
  resources: [
    {
      id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      title: "Glute activation warm-up",
      description: "",
      file: {
        originalName: "glute-activation-warm-up.pdf",
        downloadName: "glute-activation-warm-up.pdf",
        kind: "pdf",
        sizeBytes: 1_840_000,
        pageCount: 3,
      },
      addedAt: "2026-10-04T09:00:00.000Z",
      openedAt: null,
    },
  ],
};

describe("client resources loader", () => {
  it("loads her own resources", async () => {
    // arrange
    const load = vi.fn().mockResolvedValue(LISTING);
    const args = createRequestArgs({
      contexts: [
        contextEntry(clientResourcesContext, {
          ownResources: { load },
        } as unknown as ClientResourcesFeature),
      ],
      request: new Request("https://evoa.fit/client/resources"),
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual(LISTING);
    expect(load).toHaveBeenCalledWith(args);
  });
});

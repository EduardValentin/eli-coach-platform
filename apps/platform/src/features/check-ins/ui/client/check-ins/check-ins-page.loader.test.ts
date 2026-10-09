import { describe, expect, it, vi } from "vitest";

import type { ClientCheckIns } from "~/features/check-ins/public/check-ins";
import type { CheckInsFeature } from "~/features/check-ins/server/check-ins-composition.server";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./check-ins-page";

const LISTING: ClientCheckIns = {
  checkIns: [
    {
      id: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      kind: "ad_hoc",
      status: "pending",
      initiatedBy: "client",
      proposedBy: "client",
      startsAt: "2026-10-15T09:00:00.000Z",
      endsAt: "2026-10-15T10:00:00.000Z",
      joinEmphasisFrom: "2026-10-15T08:50:00.000Z",
      note: "Can we look at my squat form?",
    },
  ],
};

describe("the client's check-ins loader", () => {
  it("loads her own check-ins", async () => {
    // arrange
    const loadCheckIns = vi.fn().mockResolvedValue(LISTING);
    const args = createRequestArgs({
      contexts: [
        contextEntry(checkInsContext, {
          clientCheckIns: { loadCheckIns },
        } as unknown as CheckInsFeature),
      ],
      request: new Request("https://evoa.fit/client/checkins"),
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual(LISTING);
    expect(loadCheckIns).toHaveBeenCalledWith(args);
  });

  it("titles the page as her Evoa check-ins and keeps the portal's installed identity in the head", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([
      { title: "Check-ins | Evoa" },
      {
        name: "description",
        content: "Your coaching home: your program, check-ins and progress.",
      },
      { name: "theme-color", content: "#ffffff" },
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";

import type { CoachCheckIns } from "~/features/check-ins/public/check-ins";
import type { CheckInsFeature } from "~/features/check-ins/server/check-ins-composition.server";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./check-ins-page";

const LISTING: CoachCheckIns = {
  checkIns: [
    {
      id: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      kind: "ad_hoc",
      status: "pending",
      initiatedBy: "client",
      awaitsViewer: true,
      viewerMayWithdraw: false,
      isWaitingRequest: true,
      startsAt: "2026-10-15T09:00:00.000Z",
      endsAt: "2026-10-15T10:00:00.000Z",
      joinEmphasisFrom: "2026-10-15T08:50:00.000Z",
      note: null,
      client: { firstName: "Andreea", lastName: "Ionescu" },
    },
  ],
};

describe("the coach's check-ins loader", () => {
  it("loads every client's check-ins", async () => {
    // arrange
    const loadCheckIns = vi.fn().mockResolvedValue(LISTING);
    const args = createRequestArgs({
      contexts: [
        contextEntry(checkInsContext, {
          coachCheckIns: { loadCheckIns },
        } as unknown as CheckInsFeature),
      ],
      request: new Request("https://evoa.fit/coach/checkins"),
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual(LISTING);
    expect(loadCheckIns).toHaveBeenCalledWith(args);
  });

  it("titles the page as the coach's check-ins", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Check-ins | Evoa" }]);
  });
});

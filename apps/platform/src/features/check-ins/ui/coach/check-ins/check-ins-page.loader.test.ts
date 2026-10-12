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
      proposedBy: "client",
      awaitsViewer: true,
      viewerMayWithdraw: false,
      viewerProposal: "allowed",
      viewerMayCancel: false,
      newTimeWaits: false,
      isWaitingRequest: true,
      startsAt: "2026-10-15T09:00:00.000Z",
      endsAt: "2026-10-15T10:00:00.000Z",
      joinEmphasisFrom: "2026-10-15T08:50:00.000Z",
      earlierStartsAt: null,
      moves: 0,
      note: null,
      newTimeNote: null,
      clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
      client: { firstName: "Andreea", lastName: "Ionescu" },
    },
    {
      id: "7a3c0d2f-5e4b-4f9c-8b8d-2e3f4a5b6c7d",
      kind: "ad_hoc",
      status: "approved",
      initiatedBy: "client",
      proposedBy: "coach",
      awaitsViewer: false,
      viewerMayWithdraw: false,
      viewerProposal: "exhausted",
      viewerMayCancel: true,
      newTimeWaits: false,
      isWaitingRequest: false,
      startsAt: "2026-10-22T13:00:00.000Z",
      endsAt: "2026-10-22T14:00:00.000Z",
      joinEmphasisFrom: "2026-10-22T12:50:00.000Z",
      earlierStartsAt: "2026-10-20T12:00:00.000Z",
      moves: 2,
      note: "Can we plan my holiday training?",
      newTimeNote: "Thursday afternoon suits me better.",
      clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
      client: { firstName: "Andreea", lastName: "Ionescu" },
    },
  ],
};

describe("the coach's check-ins loader", () => {
  it("loads every client's check-ins, a moved one with its earlier time, moves and new-time note", async () => {
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

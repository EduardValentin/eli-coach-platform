import { describe, expect, it, vi } from "vitest";

import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./ended-page";

describe("ended page route", () => {
  it("loads whether her refund is still due from coaching sales", async () => {
    // arrange
    const subscription = {
      loadEnded: vi.fn().mockResolvedValue({ refundDue: true }),
    };
    const args = createRequestArgs({
      contexts: [
        contextEntry(coachingSalesContext, {
          subscription,
        } as unknown as CoachingSalesFeature),
      ],
      request: new Request("https://evoa.fit/client/ended"),
    });

    // act
    const page = await loader(args);

    // assert
    expect(page).toEqual({ refundDue: true });
    expect(subscription.loadEnded).toHaveBeenCalledWith(args);
  });

  it("titles the page and keeps it out of search results", () => {
    // arrange
    const describePage = meta;

    // act
    const tags = describePage({} as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual([
      { title: "Your coaching has ended | Evoa" },
      { name: "robots", content: "noindex" },
    ]);
  });
});

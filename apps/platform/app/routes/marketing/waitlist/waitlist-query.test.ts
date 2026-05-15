import type { Waitlist } from "@eli-coach-platform/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWaitlist } from "./waitlist-query";

const FALLBACK_WAITLIST = {
  enabled: true,
  cap: 10,
  spotsRemaining: null,
} satisfies Waitlist;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("waitlist query", () => {
  it("returns the parsed runtime waitlist data", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        enabled: false,
        cap: 10,
        spotsRemaining: 0,
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const abortController = new AbortController();

    await expect(
      fetchWaitlist({
        fallbackWaitlist: FALLBACK_WAITLIST,
        signal: abortController.signal,
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toEqual({
      enabled: false,
      cap: 10,
      spotsRemaining: 0,
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost/api/waitlist", {
      headers: {
        Accept: "application/json",
      },
      signal: abortController.signal,
    });
  });

  it("keeps the static shell waitlist data when the runtime response is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(
      fetchWaitlist({
        fallbackWaitlist: FALLBACK_WAITLIST,
        signal: new AbortController().signal,
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toBe(FALLBACK_WAITLIST);
  });
});

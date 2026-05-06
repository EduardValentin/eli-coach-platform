import type { WaitlistSnapshot } from "@eli-coach-platform/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWaitlistSnapshot } from "./waitlist-query";

const FALLBACK_SNAPSHOT = {
  enabled: true,
  cap: 10,
  spotsRemaining: null,
} satisfies WaitlistSnapshot;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("waitlist snapshot query", () => {
  it("returns the parsed runtime waitlist snapshot", async () => {
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
      fetchWaitlistSnapshot({
        fallbackSnapshot: FALLBACK_SNAPSHOT,
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

  it("keeps the static shell snapshot when the runtime response is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(
      fetchWaitlistSnapshot({
        fallbackSnapshot: FALLBACK_SNAPSHOT,
        signal: new AbortController().signal,
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toBe(FALLBACK_SNAPSHOT);
  });
});

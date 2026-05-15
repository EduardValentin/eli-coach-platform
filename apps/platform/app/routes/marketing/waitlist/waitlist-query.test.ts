// @vitest-environment happy-dom

import type { Waitlist } from "@eli-coach-platform/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchWaitlist,
  submitWaitlist,
  useJoinWaitlistMutation,
  WAITLIST_QUERY_KEY,
} from "./waitlist-query";

const FALLBACK_WAITLIST = {
  enabled: true,
  cap: 10,
  spotsRemaining: null,
} satisfies Waitlist;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
}

function renderJoinWaitlistMutationProbe(options: {
  queryClient: QueryClient;
  waitlistApiUrl: string;
}) {
  function Wrapper(props: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: options.queryClient }, props.children);
  }

  function JoinWaitlistMutationProbe() {
    const mutation = useJoinWaitlistMutation({
      waitlistApiUrl: options.waitlistApiUrl,
    });

    return createElement(
      "button",
      {
        onClick: () => {
          const formData = new FormData();
          formData.set("email", "eli@example.com");

          mutation.mutate(formData);
        },
        type: "button",
      },
      "Submit waitlist",
    );
  }

  return render(createElement(JoinWaitlistMutationProbe), { wrapper: Wrapper });
}

describe("waitlist query", () => {
  it("uses the shared marketing waitlist query key", () => {
    expect(WAITLIST_QUERY_KEY).toEqual(["marketing", "waitlist"]);
  });

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

  it("posts waitlist form data and returns a parsed success response", async () => {
    const formData = new FormData();
    formData.set("email", "eli@example.com");
    const fetch = vi.fn().mockResolvedValue(
      Response.json(
        {
          pricing: "reduced",
          spotsRemaining: 9,
          success: true,
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      submitWaitlist({
        formData,
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toEqual({
      pricing: "reduced",
      spotsRemaining: 9,
      success: true,
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost/api/waitlist", {
      body: formData,
      headers: {
        Accept: "application/json",
      },
      method: "POST",
    });
  });

  it("returns valid API error responses even when the status is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            success: false,
            error: {
              code: "invalid_email",
              message: "Unable to process waitlist signup.",
            },
          },
          { status: 422 },
        ),
      ),
    );

    await expect(
      submitWaitlist({
        formData: new FormData(),
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toEqual({
      success: false,
      error: {
        code: "invalid_email",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("returns a typed server error response when submitting fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(
      submitWaitlist({
        formData: new FormData(),
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("returns a typed server error response when the API response is malformed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true })));

    await expect(
      submitWaitlist({
        formData: new FormData(),
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("returns a typed server error response when the API returns invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json")));

    await expect(
      submitWaitlist({
        formData: new FormData(),
        waitlistApiUrl: "http://localhost/api/waitlist",
      }),
    ).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("invalidates exactly the waitlist query after a successful signup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          pricing: "reduced",
          spotsRemaining: 9,
          success: true,
        }),
      ),
    );
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const user = userEvent.setup();

    renderJoinWaitlistMutationProbe({
      queryClient,
      waitlistApiUrl: "http://localhost/api/waitlist",
    });
    await user.click(screen.getByRole("button", { name: "Submit waitlist" }));

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        exact: true,
        queryKey: WAITLIST_QUERY_KEY,
      });
    });
  });

  it("does not invalidate the waitlist query after a business error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          success: false,
          error: {
            code: "invalid_email",
            message: "Unable to process waitlist signup.",
          },
        }),
      ),
    );
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const user = userEvent.setup();

    renderJoinWaitlistMutationProbe({
      queryClient,
      waitlistApiUrl: "http://localhost/api/waitlist",
    });
    await user.click(screen.getByRole("button", { name: "Submit waitlist" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

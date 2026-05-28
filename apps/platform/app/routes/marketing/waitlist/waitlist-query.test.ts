// @vitest-environment happy-dom

import type { Waitlist } from "@eli-coach-platform/contracts";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createTestQueryClient, createTestQueryClientWrapper } from "~/test/query-client";

import {
  fetchWaitlist,
  submitWaitlist,
  useJoinWaitlistMutation,
  WAITLIST_API_URL,
  WAITLIST_QUERY_KEY,
} from "./waitlist-query";

const activeOffer = {
  plan: "12-months",
  slug: "12-months-launch-1",
} as const;

const FALLBACK_WAITLIST = {
  enabled: true,
  cap: 10,
  offer: activeOffer,
  spotsRemaining: null,
} satisfies Waitlist;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

function createEmailFormData() {
  const formData = new FormData();

  formData.set("email", "eli@example.com");

  return formData;
}

describe("waitlist query", () => {
  it("uses the shared marketing waitlist query key", () => {
    expect(WAITLIST_QUERY_KEY).toEqual(["marketing", "waitlist"]);
  });

  it("returns the parsed runtime waitlist data", async () => {
    let acceptHeader: string | null = null;

    server.use(
      http.get(WAITLIST_API_URL, ({ request }) => {
        acceptHeader = request.headers.get("Accept");

        return HttpResponse.json({
          enabled: false,
          cap: 10,
          offer: activeOffer,
          spotsRemaining: 0,
        });
      }),
    );

    await expect(
      fetchWaitlist({
        fallbackWaitlist: FALLBACK_WAITLIST,
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({
      enabled: false,
      cap: 10,
      offer: activeOffer,
      spotsRemaining: 0,
    });
    expect(acceptHeader).toBe("application/json");
  });

  it("keeps the static shell waitlist data when the runtime response is unavailable", async () => {
    server.use(http.get(WAITLIST_API_URL, () => new HttpResponse(null, { status: 500 })));

    await expect(
      fetchWaitlist({
        fallbackWaitlist: FALLBACK_WAITLIST,
        signal: new AbortController().signal,
      }),
    ).resolves.toBe(FALLBACK_WAITLIST);
  });

  it("posts waitlist form data and returns a parsed success response", async () => {
    let submittedEmail: FormDataEntryValue | null = null;

    server.use(
      http.post(WAITLIST_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedEmail = formData.get("email");

        return HttpResponse.json(
          {
            offer: activeOffer,
            pricing: "reduced",
            spotsRemaining: 9,
            success: true,
          },
          { status: 201 },
        );
      }),
    );

    await expect(submitWaitlist({ formData: createEmailFormData() })).resolves.toEqual({
      offer: activeOffer,
      pricing: "reduced",
      spotsRemaining: 9,
      success: true,
    });
    expect(submittedEmail).toBe("eli@example.com");
  });

  it("returns valid API error responses even when the status is not ok", async () => {
    server.use(
      http.post(WAITLIST_API_URL, () =>
        HttpResponse.json(
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

    await expect(submitWaitlist({ formData: createEmailFormData() })).resolves.toEqual({
      success: false,
      error: {
        code: "invalid_email",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("returns a typed server error response when submitting fails", async () => {
    server.use(http.post(WAITLIST_API_URL, () => HttpResponse.error()));

    await expect(submitWaitlist({ formData: createEmailFormData() })).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("returns a typed server error response when the API response is malformed", async () => {
    server.use(http.post(WAITLIST_API_URL, () => HttpResponse.json({ success: true })));

    await expect(submitWaitlist({ formData: createEmailFormData() })).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("returns a typed server error response when the API returns invalid JSON", async () => {
    server.use(http.post(WAITLIST_API_URL, () => new HttpResponse("not-json")));

    await expect(submitWaitlist({ formData: createEmailFormData() })).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("invalidates exactly the waitlist query after a successful signup", async () => {
    server.use(
      http.post(WAITLIST_API_URL, () =>
        HttpResponse.json({
          offer: activeOffer,
          pricing: "reduced",
          spotsRemaining: 9,
          success: true,
        }),
      ),
    );
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useJoinWaitlistMutation(), {
      wrapper: createTestQueryClientWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(createEmailFormData());
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        offer: activeOffer,
        pricing: "reduced",
        spotsRemaining: 9,
        success: true,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        exact: true,
        queryKey: WAITLIST_QUERY_KEY,
      });
    });
  });

  it("does not invalidate the waitlist query after a business error", async () => {
    server.use(
      http.post(WAITLIST_API_URL, () =>
        HttpResponse.json({
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
    const { result } = renderHook(() => useJoinWaitlistMutation(), {
      wrapper: createTestQueryClientWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(createEmailFormData());
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        success: false,
        error: {
          code: "invalid_email",
          message: "Unable to process waitlist signup.",
        },
      });
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

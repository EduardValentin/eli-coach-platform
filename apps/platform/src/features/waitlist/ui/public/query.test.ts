// @vitest-environment happy-dom

import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createTestQueryClient, createTestQueryClientWrapper } from "~test-support/support/query-client";

import {
  fetchWaitlist,
  getMillisecondsUntilNextWaitlistAvailabilityBoundary,
  submitWaitlist,
  useJoinWaitlistMutation,
  WAITLIST_API_URL,
  WAITLIST_QUERY_KEY,
} from "./query";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

const FALLBACK_WAITLIST = {
  enabled: true,
  offer: activeOffer,
  availability: null,
} satisfies Waitlist;
const API_ERROR_MESSAGE_SENTINEL = "api-error";

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
  it("uses the shared public waitlist query key", () => {
    // arrange
    const expectedQueryKey = ["public", "waitlist"];

    // act
    const queryKey = WAITLIST_QUERY_KEY;

    // assert
    expect(queryKey).toEqual(expectedQueryKey);
  });

  it("returns the parsed runtime waitlist data", async () => {
    // arrange
    let acceptHeader: string | null = null;

    server.use(
      http.get(WAITLIST_API_URL, ({ request }) => {
        acceptHeader = request.headers.get("Accept");

        return HttpResponse.json({
          enabled: false,
          offer: activeOffer,
          availability: "closed",
        });
      }),
    );

    // act
    const waitlistPromise = fetchWaitlist({
      fallbackWaitlist: FALLBACK_WAITLIST,
      signal: new AbortController().signal,
    });

    // assert
    await expect(waitlistPromise).resolves.toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "closed",
    });
    expect(acceptHeader).toBe("application/json");
  });

  it.each([
    ["2026-07-26T10:12:00.000Z", 1_080_000],
    ["2026-07-26T10:29:59.000Z", 1_000],
    ["2026-07-26T10:30:00.000Z", 1_800_000],
  ] as const)(
    "schedules the next availability refresh from %s in %d milliseconds",
    (currentTime, expectedDelay) => {
      // arrange
      const now = new Date(currentTime);

      // act
      const delay = getMillisecondsUntilNextWaitlistAvailabilityBoundary(now);

      // assert
      expect(delay).toBe(expectedDelay);
    },
  );

  it("keeps the static shell waitlist data when the runtime response is unavailable", async () => {
    // arrange
    server.use(http.get(WAITLIST_API_URL, () => new HttpResponse(null, { status: 500 })));

    // act
    const waitlistPromise = fetchWaitlist({
      fallbackWaitlist: FALLBACK_WAITLIST,
      signal: new AbortController().signal,
    });

    // assert
    await expect(waitlistPromise).resolves.toBe(FALLBACK_WAITLIST);
  });

  it("posts waitlist form data and returns a parsed success response", async () => {
    // arrange
    let submittedEmail: FormDataEntryValue | null = null;

    server.use(
      http.post(WAITLIST_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedEmail = formData.get("email");

        return HttpResponse.json(
          { success: true },
          { status: 201 },
        );
      }),
    );

    // act
    const submitPromise = submitWaitlist({ formData: createEmailFormData() });

    // assert
    await expect(submitPromise).resolves.toEqual({ success: true });
    expect(submittedEmail).toBe("eli@example.com");
  });

  it("returns valid API error responses even when the status is not ok", async () => {
    // arrange
    server.use(
      http.post(WAITLIST_API_URL, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: "invalid_email",
              message: API_ERROR_MESSAGE_SENTINEL,
            },
          },
          { status: 422 },
        ),
      ),
    );

    // act
    const submitPromise = submitWaitlist({ formData: createEmailFormData() });

    // assert
    await expect(submitPromise).resolves.toEqual({
      success: false,
      error: {
        code: "invalid_email",
        message: API_ERROR_MESSAGE_SENTINEL,
      },
    });
  });

  it("returns a typed server error response when submitting fails", async () => {
    // arrange
    server.use(http.post(WAITLIST_API_URL, () => HttpResponse.error()));

    // act
    const result = await submitWaitlist({ formData: createEmailFormData() });

    // assert
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "server_error",
      },
    });
    if (result.success) {
      throw new Error("Expected a server error response.");
    }
    expect(result.error.message.trim().length).toBeGreaterThan(0);
  });

  it("returns a typed server error response when the API response is malformed", async () => {
    // arrange
    server.use(http.post(WAITLIST_API_URL, () => HttpResponse.json({ success: "true" })));

    // act
    const result = await submitWaitlist({ formData: createEmailFormData() });

    // assert
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "server_error",
      },
    });
    if (result.success) {
      throw new Error("Expected a server error response.");
    }
    expect(result.error.message.trim().length).toBeGreaterThan(0);
  });

  it("returns a typed server error response when the API returns invalid JSON", async () => {
    // arrange
    server.use(http.post(WAITLIST_API_URL, () => new HttpResponse("not-json")));

    // act
    const result = await submitWaitlist({ formData: createEmailFormData() });

    // assert
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "server_error",
      },
    });
    if (result.success) {
      throw new Error("Expected a server error response.");
    }
    expect(result.error.message.trim().length).toBeGreaterThan(0);
  });

  it("does not invalidate the waitlist query after a successful signup", async () => {
    // arrange
    server.use(
      http.post(WAITLIST_API_URL, () =>
        HttpResponse.json({ success: true }),
      ),
    );
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useJoinWaitlistMutation(), {
      wrapper: createTestQueryClientWrapper(queryClient),
    });

    // act
    act(() => {
      result.current.mutate(createEmailFormData());
    });

    // assert
    await waitFor(() => {
      expect(result.current.data).toEqual({ success: true });
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("does not invalidate the waitlist query after a business error", async () => {
    // arrange
    server.use(
      http.post(WAITLIST_API_URL, () =>
        HttpResponse.json({
          success: false,
          error: {
            code: "invalid_email",
            message: API_ERROR_MESSAGE_SENTINEL,
          },
        }),
      ),
    );
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useJoinWaitlistMutation(), {
      wrapper: createTestQueryClientWrapper(queryClient),
    });

    // act
    act(() => {
      result.current.mutate(createEmailFormData());
    });

    // assert
    await waitFor(() => {
      expect(result.current.data).toEqual({
        success: false,
        error: {
          code: "invalid_email",
          message: API_ERROR_MESSAGE_SENTINEL,
        },
      });
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

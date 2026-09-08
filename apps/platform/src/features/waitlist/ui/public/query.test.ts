// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createTestQueryClient, createTestQueryClientWrapper } from "~test-utils/query-client";

import {
  submitWaitlist,
  useJoinWaitlistMutation,
  WAITLIST_API_URL,
} from "./query";

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

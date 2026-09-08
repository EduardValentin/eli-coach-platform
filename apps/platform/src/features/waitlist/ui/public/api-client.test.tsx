// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import {
  parseWaitlistJoinResponse,
  useJoinWaitlistFetcher,
  WAITLIST_API_PATH,
  WAITLIST_API_URL,
} from "./api-client";

const API_ERROR_MESSAGE_SENTINEL = "api-error";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function createEmailFormData() {
  const formData = new FormData();

  formData.set("email", "eli@example.com");

  return formData;
}

let latestFetcher: ReturnType<typeof useJoinWaitlistFetcher> | null = null;

function FetcherProbe() {
  latestFetcher = useJoinWaitlistFetcher();

  return (
    <p>
      {latestFetcher.isSubmitting
        ? "submitting"
        : (latestFetcher.response?.success.toString() ?? "idle")}
    </p>
  );
}

function renderFetcher() {
  latestFetcher = null;
  const router = createMemoryRouter(
    [
      { Component: FetcherProbe, path: "/" },
      { action: async ({ request }) => fetch(request), path: WAITLIST_API_PATH },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
}

describe("waitlist join fetcher", () => {
  it("posts form data through the router and exposes the parsed success response", async () => {
    // arrange
    let submittedEmail: FormDataEntryValue | null = null;
    server.use(
      http.post(WAITLIST_API_URL, async ({ request }) => {
        submittedEmail = (await request.formData()).get("email");

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderFetcher();

    // act
    act(() => {
      latestFetcher?.submit(createEmailFormData());
    });

    // assert
    expect(await screen.findByText("true")).toBeInTheDocument();
    expect(submittedEmail).toBe("eli@example.com");
    expect(latestFetcher?.isSubmitting).toBe(false);
  });

  it("exposes a business error response even when the status is not ok", async () => {
    // arrange
    server.use(
      http.post(WAITLIST_API_URL, () =>
        HttpResponse.json(
          { success: false, error: { code: "invalid_email", message: API_ERROR_MESSAGE_SENTINEL } },
          { status: 400 },
        ),
      ),
    );
    renderFetcher();

    // act
    act(() => {
      latestFetcher?.submit(createEmailFormData());
    });

    // assert
    await waitFor(() => {
      expect(latestFetcher?.response).toEqual({
        success: false,
        error: { code: "invalid_email", message: API_ERROR_MESSAGE_SENTINEL },
      });
    });
  });

  it("hides the previous response while the next submission is in flight", async () => {
    // arrange
    let releaseSecondResponse = () => {};
    let submitCount = 0;
    server.use(
      http.post(WAITLIST_API_URL, async () => {
        submitCount += 1;

        if (submitCount === 2) {
          await new Promise<void>((resolve) => {
            releaseSecondResponse = resolve;
          });
        }

        return HttpResponse.json({ success: true });
      }),
    );
    renderFetcher();
    act(() => {
      latestFetcher?.submit(createEmailFormData());
    });
    await screen.findByText("true");

    // act
    act(() => {
      latestFetcher?.submit(createEmailFormData());
    });

    // assert
    expect(await screen.findByText("submitting")).toBeInTheDocument();
    releaseSecondResponse();
    expect(await screen.findByText("true")).toBeInTheDocument();
  });
});

describe("parseWaitlistJoinResponse", () => {
  it.each([
    ["a malformed body", { success: "true" }],
    ["a plain-text body", "not-json"],
    ["an empty body", ""],
  ])("returns a typed server error for %s", (_label, body) => {
    // arrange, act
    const result = parseWaitlistJoinResponse(body);

    // assert
    expect(result).toMatchObject({ success: false, error: { code: "server_error" } });
    if (result.success) {
      throw new Error("Expected a server error response.");
    }
    expect(result.error.message.trim().length).toBeGreaterThan(0);
  });
});

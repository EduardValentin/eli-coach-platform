// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { useJoinWaitlistFetcher, WAITLIST_API_PATH, WAITLIST_API_URL } from "./api-client";

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
  const fetcher = useJoinWaitlistFetcher();
  latestFetcher = fetcher;

  return <p>{describeFetcher(fetcher)}</p>;
}

function describeFetcher(fetcher: ReturnType<typeof useJoinWaitlistFetcher>): string {
  if (fetcher.isSubmitting) {
    return "submitting";
  }

  if (fetcher.response === null) {
    return "idle";
  }

  return fetcher.response.success ? "success" : `error:${fetcher.response.error.code}`;
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

function submitEmail() {
  act(() => {
    latestFetcher?.submit(createEmailFormData());
  });
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
    submitEmail();

    // assert
    expect(await screen.findByText("success")).toBeInTheDocument();
    expect(submittedEmail).toBe("eli@example.com");
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
    submitEmail();

    // assert
    expect(await screen.findByText("error:invalid_email")).toBeInTheDocument();
  });

  it.each([
    ["a malformed JSON body", () => HttpResponse.json({ success: "true" })],
    ["a plain-text body", () => new HttpResponse("not-json")],
    ["an empty body", () => new HttpResponse(null, { status: 204 })],
  ])("exposes a server error for %s", async (_label, respond) => {
    // arrange
    server.use(http.post(WAITLIST_API_URL, () => respond()));
    renderFetcher();

    // act
    submitEmail();

    // assert
    expect(await screen.findByText("error:server_error")).toBeInTheDocument();
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
    submitEmail();
    await screen.findByText("success");

    // act
    submitEmail();

    // assert
    expect(await screen.findByText("submitting")).toBeInTheDocument();
    releaseSecondResponse();
    expect(await screen.findByText("success")).toBeInTheDocument();
  });
});

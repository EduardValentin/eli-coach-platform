// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import {
  parseStoreAcquisitionResponse,
  STORE_ACQUISITIONS_API_URL,
  STORE_ACQUISITIONS_ROUTE_PATH,
  useStoreAcquisitionFetcher,
} from "./api-client";

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

let latestFetcher: ReturnType<typeof useStoreAcquisitionFetcher> | null = null;

function FetcherProbe() {
  latestFetcher = useStoreAcquisitionFetcher();

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
      { action: async ({ request }) => fetch(request), path: STORE_ACQUISITIONS_ROUTE_PATH },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
}

function createAcquisitionFormData() {
  const formData = new FormData();

  formData.set("email", "woman@example.com");

  return formData;
}

describe("store acquisition fetcher", () => {
  it("posts acquisition form data through the public request boundary", async () => {
    // arrange
    let submittedEmail: FormDataEntryValue | null = null;
    server.use(
      http.post(STORE_ACQUISITIONS_API_URL, async ({ request }) => {
        submittedEmail = (await request.formData()).get("email");

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderFetcher();

    // act
    act(() => {
      latestFetcher?.submit(createAcquisitionFormData());
    });

    // assert
    expect(await screen.findByText("true")).toBeInTheDocument();
    expect(submittedEmail).toBe("woman@example.com");
  });

  it("forgets the previous response when reset", async () => {
    // arrange
    server.use(
      http.post(STORE_ACQUISITIONS_API_URL, () =>
        HttpResponse.json({ success: true }, { status: 201 }),
      ),
    );
    renderFetcher();
    act(() => {
      latestFetcher?.submit(createAcquisitionFormData());
    });
    await screen.findByText("true");

    // act
    act(() => {
      latestFetcher?.reset();
    });

    // assert
    expect(await screen.findByText("idle")).toBeInTheDocument();
  });
});

describe("parseStoreAcquisitionResponse", () => {
  it("returns a typed server error for a malformed body", () => {
    // arrange, act
    const result = parseStoreAcquisitionResponse({ success: "true" });

    // assert
    expect(result).toEqual({
      error: { code: "server_error", message: "Unable to deliver store resources." },
      success: false,
    });
  });
});

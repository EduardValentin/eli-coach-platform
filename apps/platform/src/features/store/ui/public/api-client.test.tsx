// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import {
  STORE_ACQUISITIONS_API_PATH,
  STORE_ACQUISITIONS_API_URL,
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
  const fetcher = useStoreAcquisitionFetcher();
  latestFetcher = fetcher;

  return <p>{describeFetcher(fetcher)}</p>;
}

function describeFetcher(fetcher: ReturnType<typeof useStoreAcquisitionFetcher>): string {
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
      { action: async ({ request }) => fetch(request), path: STORE_ACQUISITIONS_API_PATH },
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

function submitAcquisition() {
  act(() => {
    latestFetcher?.submit(createAcquisitionFormData());
  });
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
    submitAcquisition();

    // assert
    expect(await screen.findByText("success")).toBeInTheDocument();
    expect(submittedEmail).toBe("woman@example.com");
  });

  it("exposes a server error for a malformed JSON body", async () => {
    // arrange
    server.use(http.post(STORE_ACQUISITIONS_API_URL, () => HttpResponse.json({ success: "true" })));
    renderFetcher();

    // act
    submitAcquisition();

    // assert
    expect(await screen.findByText("error:server_error")).toBeInTheDocument();
  });

  it("forgets the previous response when reset", async () => {
    // arrange
    server.use(
      http.post(STORE_ACQUISITIONS_API_URL, () =>
        HttpResponse.json({ success: true }, { status: 201 }),
      ),
    );
    renderFetcher();
    submitAcquisition();
    await screen.findByText("success");

    // act
    act(() => {
      latestFetcher?.reset();
    });

    // assert
    expect(await screen.findByText("idle")).toBeInTheDocument();
  });
});

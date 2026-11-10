// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { StrictMode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { clientAction as readDownloadContents } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/download-contents";
import { frameworkModeAction } from "~/composition-root/test-support/framework-mode-action";
import { STORE_API_PATHS } from "~/bounded-contexts/sales/store/public/paths";

import DownloadRoute from "./download-page";

const DOWNLOAD_TOKEN = "opaque-download-token";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.history.replaceState({}, "", "/");
});

afterAll(() => {
  server.close();
});

describe("store download page", () => {
  it("lists every granted resource with its type and offers the download through a native POST form", async () => {
    // arrange
    const requestedTokens = answerContents(
      HttpResponse.json({
        status: "available",
        resources: [
          { title: "Hormone Harmony E-Book", typeLabels: ["E-Books"] },
          {
            title: "10-Day Core Challenge",
            typeLabels: ["Workouts", "Nutrition Plans"],
          },
        ],
      }),
    );
    window.history.replaceState({}, "", `/store/download#${DOWNLOAD_TOKEN}`);

    // act
    const { container } = renderDownloadPage();

    // assert
    const resources = await screen.findByRole("list");
    expect(
      within(resources)
        .getAllByRole("listitem")
        .map((resource) => resource.textContent),
    ).toEqual([
      "Hormone Harmony E-BookE-Books",
      "10-Day Core ChallengeWorkouts, Nutrition Plans",
    ]);
    expect(
      screen.getByRole("heading", { level: 1, name: "Your resources" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Everything you requested is ready. Your download stays available for seven days after each request.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("One secure download")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Single files download directly/),
    ).not.toBeInTheDocument();
    expect(requestedTokens).toEqual([DOWNLOAD_TOKEN]);
    expect(window.location.hash).toBe("");
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/api/store/downloads");
    expect(
      container.querySelector<HTMLInputElement>('input[name="token"]'),
    ).toHaveValue(DOWNLOAD_TOKEN);
    expect(
      screen.getByRole("button", { name: "Download your resources" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse the store" }),
    ).toHaveAttribute("href", "/store");
  });

  it("asks for the contents once and keeps the fragment token when strict mode runs its effects twice", async () => {
    // arrange
    const requestedTokens = answerContents(
      HttpResponse.json({
        status: "available",
        resources: [
          { title: "Hormone Harmony E-Book", typeLabels: ["E-Books"] },
        ],
      }),
    );
    window.history.replaceState({}, "", `/store/download#${DOWNLOAD_TOKEN}`);

    // act
    const { container } = render(
      <StrictMode>
        <RouterProvider router={createDownloadRouter()} />
      </StrictMode>,
    );

    // assert
    expect(
      await screen.findByText("Hormone Harmony E-Book"),
    ).toBeInTheDocument();
    expect(requestedTokens).toEqual([DOWNLOAD_TOKEN]);
    expect(
      container.querySelector<HTMLInputElement>('input[name="token"]'),
    ).toHaveValue(DOWNLOAD_TOKEN);
  });

  it("shows the unavailable page when the link resolves to no grant", async () => {
    // arrange
    answerContents(HttpResponse.json({ status: "unavailable" }));
    window.history.replaceState({}, "", "/store/download#expired-token");

    // act
    renderDownloadPage();

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "This link is no longer available",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Download your resources" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to the store/i }),
    ).toHaveAttribute("href", "/store");
  });

  it("keeps the download offered without the list when the contents cannot be read right now", async () => {
    // arrange
    answerContents(
      HttpResponse.json({ status: "temporarily_unavailable" }, { status: 503 }),
    );
    window.history.replaceState({}, "", `/store/download#${DOWNLOAD_TOKEN}`);

    // act
    renderDownloadPage();

    // assert
    expect(
      await screen.findByRole("button", { name: "Download your resources" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the unavailable page without asking the server when no private token is present", async () => {
    // arrange
    window.history.replaceState({}, "", "/store/download");

    // act
    renderDownloadPage();

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "This link is no longer available",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to the store/i }),
    ).toHaveAttribute("href", "/store");
  });

  it("shows the unavailable page after a failed download even when a fragment remains", async () => {
    // arrange
    window.history.replaceState(
      {},
      "",
      `/store/download?unavailable=1#${DOWNLOAD_TOKEN}`,
    );

    // act
    renderDownloadPage();

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "This link is no longer available",
      }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
  });
});

function answerContents(answer: Response): string[] {
  const requestedTokens: string[] = [];
  server.use(
    http.post(STORE_API_PATHS.downloadContents, async ({ request }) => {
      requestedTokens.push(String((await request.formData()).get("token")));

      return answer.clone();
    }),
  );

  return requestedTokens;
}

function createDownloadRouter() {
  return createMemoryRouter(
    [
      { Component: DownloadRoute, path: "/store/download" },
      {
        action: frameworkModeAction(readDownloadContents),
        path: STORE_API_PATHS.downloadContents,
      },
    ],
    { initialEntries: ["/store/download"] },
  );
}

function renderDownloadPage() {
  return render(<RouterProvider router={createDownloadRouter()} />);
}

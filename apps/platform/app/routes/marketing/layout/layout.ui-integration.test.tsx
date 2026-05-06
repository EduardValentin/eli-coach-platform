// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { PlatformQueryProvider } from "~/query-client";
import HomeRoute from "../home";

import MarketingLayoutRoute from "./layout";

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

function renderMarketingHomeShell() {
  const router = createMemoryRouter([
    {
      children: [
        {
          index: true,
          element: <HomeRoute />,
        },
      ],
      element: <MarketingLayoutRoute />,
      loader: () => ({
        botDetectionConfig: {
          provider: "static",
          token: "XXXX.DUMMY.TOKEN.XXXX",
        },
        waitlist: {
          enabled: true,
          cap: 10,
          spotsRemaining: null,
        },
      }),
      path: "/",
    },
  ]);

  render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

describe("marketing layout UI integration", () => {
  it("hydrates the static shell with the live waitlist snapshot", async () => {
    server.use(
      http.get("/api/waitlist", () =>
        HttpResponse.json({
          enabled: true,
          cap: 10,
          spotsRemaining: 4,
        }),
      ),
    );

    renderMarketingHomeShell();

    expect(screen.queryByText("4 of 10 spots remaining")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("4 of 10 spots remaining")).toBeInTheDocument();
    });
  });

  it("keeps the static shell when the live waitlist snapshot is unavailable", async () => {
    server.use(
      http.get("/api/waitlist", () =>
        HttpResponse.text("Not found", { status: 404 }),
      ),
    );

    renderMarketingHomeShell();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Error: 404 Not Found")).not.toBeInTheDocument();
  });

  it("switches the static shell to normal mode when the live snapshot disables waitlist mode", async () => {
    server.use(
      http.get("/api/waitlist", () =>
        HttpResponse.json({
          enabled: false,
          cap: 10,
          spotsRemaining: 0,
        }),
      ),
    );

    renderMarketingHomeShell();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });
});

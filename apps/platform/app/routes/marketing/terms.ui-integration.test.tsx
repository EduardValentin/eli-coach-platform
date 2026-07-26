// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { configureAxe } from "vitest-axe";
import { createMemoryRouter, RouterProvider } from "react-router";

import MarketingLayoutRoute from "./layout/layout";
import TermsRoute from "./terms";
import { WAITLIST_API_URL } from "./waitlist/waitlist-query";

const server = setupServer();
const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});
const uiIntegrationWait = { timeout: 5_000 } as const;

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

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

function renderTermsRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
      },
    },
  });
  const router = createMemoryRouter(
    [
      {
        children: [
          {
            element: <TermsRoute />,
            path: "terms",
          },
        ],
        element: <MarketingLayoutRoute />,
        loader: () => ({
          botDetectionConfig: {
            provider: "static",
            token: "XXXX.DUMMY.TOKEN.XXXX",
          },
          waitlist: {
            availability: null,
            enabled: true,
            offer: activeOffer,
          },
        }),
        path: "/",
      },
    ],
    { initialEntries: ["/terms"] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("TermsRoute UI integration", () => {
  it("renders Terms in the public marketing layout after the runtime waitlist request", async () => {
    // arrange
    let waitlistRequestCount = 0;

    server.use(
      http.get(WAITLIST_API_URL, () => {
        waitlistRequestCount += 1;

        return HttpResponse.json({
          availability: "available",
          enabled: true,
          offer: activeOffer,
        });
      }),
    );

    // act
    const { baseElement } = renderTermsRoute();

    // assert
    await waitFor(() => {
      expect(waitlistRequestCount).toBe(1);
    }, uiIntegrationWait);

    const article = screen.getByRole("article");
    const main = screen.getByRole("main", { name: /\S/ });
    const [footer] = screen.getAllByRole("contentinfo");
    const legalNavigation = within(footer).getByRole("navigation", { name: "Legal" });

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(within(article).getByRole("heading", { level: 1, name: "Terms & Conditions" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(within(article).getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(20);
    expect(main).toBeInTheDocument();
    expect(within(article).getByText("Version 1.0")).toBeInTheDocument();
    expect(within(article).getByText("26 July 2026")).toBeInTheDocument();
    expect(
      within(article).getAllByRole("link", { name: "support@evoa.com" }),
    ).not.toHaveLength(0);
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
    expect(within(footer).getAllByRole("navigation", { name: "Legal" })).toHaveLength(1);
    expect(
      within(legalNavigation).getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect((await axe(baseElement)).violations).toEqual([]);
  });

  it("keeps Terms visible when the runtime waitlist request fails", async () => {
    // arrange
    let signalWaitlistRequestStarted!: () => void;
    const waitlistRequestStarted = new Promise<void>((resolve) => {
      signalWaitlistRequestStarted = resolve;
    });
    let releaseWaitlistResponse!: () => void;
    const waitlistResponseRelease = new Promise<void>((resolve) => {
      releaseWaitlistResponse = resolve;
    });
    let signalWaitlistResponseReturned!: () => void;
    const waitlistResponseReturned = new Promise<void>((resolve) => {
      signalWaitlistResponseReturned = resolve;
    });

    server.use(
      http.get(
        WAITLIST_API_URL,
        async () => {
          signalWaitlistRequestStarted();
          await waitlistResponseRelease;

          const response = new HttpResponse(null, { status: 503 });

          signalWaitlistResponseReturned();
          return response;
        },
      ),
    );

    // act
    renderTermsRoute();
    await waitlistRequestStarted;
    await act(async () => {
      releaseWaitlistResponse();
      await waitlistResponseReturned;
    });

    // assert
    await waitFor(() => {
      expect(screen.getByRole("article")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 1, name: "Terms & Conditions" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Version 1.0")).toBeInTheDocument();
      expect(
        within(screen.getByRole("article")).getAllByRole("link", {
          name: "support@evoa.com",
        }),
      ).not.toHaveLength(0);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, uiIntegrationWait);
  });
});

// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { configureAxe } from "vitest-axe";
import { createMemoryRouter, RouterProvider } from "react-router";

import PrivacyRoute from "./privacy";
import { WAITLIST_API_URL, WAITLIST_QUERY_KEY } from "./waitlist/waitlist-query";
import MarketingLayoutRoute from "./layout/layout";

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

function renderPrivacyRoute() {
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
            element: <PrivacyRoute />,
            path: "privacy",
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
    { initialEntries: ["/privacy"] },
  );

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

describe("PrivacyRoute UI integration", () => {
  it("renders the policy in the public marketing layout after the runtime waitlist request", async () => {
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
    const { baseElement } = renderPrivacyRoute();

    // assert
    await waitFor(() => {
      expect(waitlistRequestCount).toBe(1);
    }, uiIntegrationWait);
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Public site content" })).toBeInTheDocument();

    const footers = screen.getAllByRole("contentinfo");

    expect(footers).toHaveLength(1);
    expect(
      within(footers[0]).getByRole("navigation", { name: "Legal" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Start your next step" }),
    ).not.toBeInTheDocument();
    expect((await axe(baseElement)).violations).toEqual([]);
  });

  it("keeps the privacy policy visible when the runtime waitlist request fails", async () => {
    // arrange
    let completeWaitlistRequest: (() => void) | undefined;

    server.use(
      http.get(
        WAITLIST_API_URL,
        () =>
          new Promise((resolve) => {
            completeWaitlistRequest = () => {
              resolve(new HttpResponse(null, { status: 503 }));
            };
          }),
      ),
    );

    // act
    const { queryClient } = renderPrivacyRoute();

    // assert
    await waitFor(() => {
      expect(completeWaitlistRequest).toBeDefined();
      expect(queryClient.getQueryState(WAITLIST_QUERY_KEY)?.fetchStatus).toBe("fetching");
    }, uiIntegrationWait);
    completeWaitlistRequest?.();
    await waitFor(() => {
      const queryState = queryClient.getQueryState(WAITLIST_QUERY_KEY);

      expect(queryState?.fetchStatus).toBe("idle");
      expect(queryState?.status).toBe("success");
    }, uiIntegrationWait);
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Reduced-price spots available")).not.toBeInTheDocument();
    expect(screen.queryByText("Limited spots")).not.toBeInTheDocument();
    expect(screen.queryByText("Reduced-price spots closed")).not.toBeInTheDocument();
  });
});

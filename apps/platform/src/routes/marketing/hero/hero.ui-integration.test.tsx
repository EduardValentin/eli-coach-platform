// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { BotDetectionRuntimeState } from "@eli-coach-platform/infrastructure/bot-detection";
import { PlatformQueryProvider } from "~/query-client";

import { launchWaitlistConfetti } from "../waitlist/waitlist-confetti";
import { useWaitlistQuery, WAITLIST_API_URL } from "../waitlist/waitlist-query";
import { MarketingHero } from "./hero";

vi.mock("../waitlist/waitlist-confetti", () => ({
  launchWaitlistConfetti: vi.fn(),
}));

const server = setupServer();

const STATIC_BOT_DETECTION = {
  config: {
    provider: "static",
    token: TURNSTILE_TEST_RESPONSE_TOKEN,
  },
  status: "ready",
} satisfies BotDetectionRuntimeState;

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

function QueryBackedHero() {
  const waitlistQuery = useWaitlistQuery({
    initialWaitlist: {
      availability: "available",
      enabled: true,
      offer: activeOffer,
    },
  });

  return (
    <MarketingHero
      botDetection={STATIC_BOT_DETECTION}
      waitlist={waitlistQuery.data}
      waitlistAvailabilityPresentationState="ready"
    />
  );
}

function renderHeroWithApi() {
  const router = createMemoryRouter(
    [
      {
        element: <QueryBackedHero />,
        path: "/",
      },
      {
        action: async ({ request }) => fetch(request),
        path: "/api/waitlist",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

function getHeroEmailInput() {
  return screen.getByRole("textbox", { name: /\S/ });
}

function getHeroSubmitButton() {
  const form = getHeroEmailInput().closest("form");

  if (!form) {
    throw new Error("Expected the hero email input to belong to a form.");
  }

  return within(form).getByRole("button", { name: /\S/ });
}

describe("MarketingHero UI integration", () => {
  it("submits through the API with generic feedback and no immediate availability refetch", async () => {
    // arrange
    const user = userEvent.setup();
    let getRequestCount = 0;
    let submittedEmail: FormDataEntryValue | null = null;
    let submittedToken: FormDataEntryValue | null = null;
    server.use(
      http.get(WAITLIST_API_URL, () => {
        getRequestCount += 1;

        return HttpResponse.json({
          availability: "available",
          enabled: true,
          offer: activeOffer,
        });
      }),
      http.post(WAITLIST_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedEmail = formData.get("email");
        submittedToken = formData.get("cf-turnstile-response");

        return HttpResponse.json(
          {
            success: true,
          },
          { status: 201 },
        );
      }),
    );

    renderHeroWithApi();

    // act
    await user.type(getHeroEmailInput(), "eli@example.com");
    await user.click(getHeroSubmitButton());

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(getRequestCount).toBe(1);
    expect(submittedEmail).toBe("eli@example.com");
    expect(submittedToken).toBe(TURNSTILE_TEST_RESPONSE_TOKEN);
    expect(launchWaitlistConfetti).toHaveBeenCalledTimes(1);
  });
});

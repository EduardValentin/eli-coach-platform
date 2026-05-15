// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { PlatformQueryProvider } from "~/query-client";

import { MarketingHero } from "./hero";

const server = setupServer();

const STATIC_BOT_DETECTION = {
  provider: "static",
  token: TURNSTILE_TEST_RESPONSE_TOKEN,
} satisfies BotDetectionConfig;

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

function renderHeroWithApi() {
  const router = createMemoryRouter(
    [
      {
        element: (
          <MarketingHero
            botDetectionConfig={STATIC_BOT_DETECTION}
            waitlist={{
              enabled: true,
              cap: 10,
              spotsRemaining: 10,
            }}
            waitlistApiUrl="http://localhost/api/waitlist"
          />
        ),
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

describe("MarketingHero UI integration", () => {
  it("submits through the API and renders the reduced pricing signup state", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost/api/waitlist", async ({ request }) => {
        const formData = await request.formData();

        expect(formData.get("email")).toBe("eli@example.com");
        expect(formData.get("cf-turnstile-response")).toBe(TURNSTILE_TEST_RESPONSE_TOKEN);

        return HttpResponse.json(
          {
            pricing: "reduced",
            success: true,
            spotsRemaining: 9,
          },
          { status: 201 },
        );
      }),
    );

    renderHeroWithApi();
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("9 of 10 spots remaining")).toBeInTheDocument();
    });
  });
});

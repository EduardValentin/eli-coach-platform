// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { MarketingHero } from "./hero";

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

describe("MarketingHero waitlist integration", () => {
  it("submits through the API and renders the reduced pricing signup state", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost/api/waitlist", async ({ request }) => {
        const formData = await request.formData();

        expect(formData.get("email")).toBe("eli@example.com");

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
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <MarketingHero
              botDetection={{ turnstileSiteKey: "1x00000000000000000000BB" }}
              waitlist={{
                enabled: true,
                cap: 10,
                spotsRemaining: 10,
              }}
            />
          ),
        },
        {
          action: async ({ request }) => fetch(request),
          path: "/api/waitlist",
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
    expect(screen.getByText("9 of 10 spots remaining")).toBeInTheDocument();
  });
});

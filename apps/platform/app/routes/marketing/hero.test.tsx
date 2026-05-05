// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { ActionFunctionArgs } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";

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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

afterAll(() => {
  server.close();
});

function renderHero(
  waitlist: {
    enabled: boolean;
    cap: number;
    spotsRemaining: number | null;
  },
  options?: {
    apiAction?: (args: ActionFunctionArgs) => Promise<Response> | Response;
  },
) {
  const router = createMemoryRouter(
    [
      {
        element: <MarketingHero botDetection={STATIC_BOT_DETECTION} waitlist={waitlist} />,
        path: "/",
      },
      {
        action:
          options?.apiAction ??
          (() => new Response(null, { status: 404, statusText: "Not Found" })),
        path: "/api/waitlist",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("MarketingHero local interactions", () => {
  it("renders the waitlist form and counter in waitlist mode", () => {
    renderHero({ enabled: true, cap: 10, spotsRemaining: 10 });

    expect(
      screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Limited spots")).toBeInTheDocument();
    expect(
      screen.getByText("Strength, nutrition, and cycle-aware coaching", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "reduced pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByText("10 of 10 spots remaining")).toBeInTheDocument();
  });

  it("renders the closed waitlist state when all spots are claimed", () => {
    renderHero({ enabled: true, cap: 10, spotsRemaining: 0 });

    expect(
      screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
    ).toBeInTheDocument();
    expect(screen.getByText("This round is full")).toBeInTheDocument();
    expect(
      screen.getByText("Leave your email — I'll let you know when new spots open."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("All 10 spots have been claimed", { exact: false }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();
    expect(screen.queryByText("0 of 10 spots remaining")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("renders the normal CTA shell when waitlist mode is disabled", () => {
    renderHero({ enabled: false, cap: 10, spotsRemaining: 10 });

    expect(
      screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See if we’re a fit" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });

  it("renders exactly one h1", () => {
    const { unmount } = renderHero({ enabled: true, cap: 10, spotsRemaining: 10 });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    unmount();
    renderHero({ enabled: false, cap: 10, spotsRemaining: 10 });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders a first-party hero video with a poster before loading sources", async () => {
    vi.useFakeTimers();
    const { container } = renderHero({ enabled: false, cap: 10, spotsRemaining: 10 });

    const video = container.querySelector("video");

    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("poster", "/media/hero/hero-training-poster.jpg");
    expect(video).toHaveAttribute("preload", "none");
    expect(video?.querySelectorAll("source")).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(video?.querySelector("source[type='video/webm']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.webm",
    );
    expect(video?.querySelector("source[type='video/mp4']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.mp4",
    );
    expect(container.innerHTML).not.toContain("pexels.com");
    expect(container.innerHTML).not.toContain("images.unsplash.com");
  });

  it("keeps the poster only when reduced motion is requested", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        removeEventListener: vi.fn(),
      }),
    );

    const { container } = renderHero({ enabled: false, cap: 10, spotsRemaining: 10 });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(container.querySelector("video source")).not.toBeInTheDocument();
  });

  it("exposes keyboard-operable video controls", async () => {
    const user = userEvent.setup();
    renderHero({ enabled: true, cap: 10, spotsRemaining: 10 });

    await user.tab();

    expect(screen.getByRole("button", { name: "Pause hero video" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Restart hero video" })).toBeInTheDocument();
  });

  it("pauses the background video when reduced motion is requested", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        removeEventListener: vi.fn(),
      }),
    );

    renderHero({ enabled: true, cap: 10, spotsRemaining: 10 });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play hero video" })).toBeInTheDocument();
    });
  });
});

describe("MarketingHero waitlist API integration", () => {
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

    renderHero(
      { enabled: true, cap: 10, spotsRemaining: 10 },
      {
        apiAction: async ({ request }) => fetch(request),
      },
    );
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

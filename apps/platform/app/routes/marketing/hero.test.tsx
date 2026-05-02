// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useFetcher } from "react-router";

import { MarketingHero } from "./hero";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useFetcher: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mockFetcher() {
  vi.mocked(useFetcher).mockReturnValue({
    Form: "form",
    data: undefined,
    state: "idle",
  } as unknown as ReturnType<typeof useFetcher>);
}

function renderHero(waitlist: {
  enabled: boolean;
  cap: number;
  spotsRemaining: number | null;
}) {
  mockFetcher();

  return render(
    <MemoryRouter>
      <MarketingHero waitlist={{ ...waitlist, prospects: [] }} />
    </MemoryRouter>,
  );
}

describe("MarketingHero", () => {
  it("renders the waitlist form and counter in waitlist mode", () => {
    renderHero({ enabled: true, cap: 10, spotsRemaining: 10 });

    expect(
      screen.getByRole("heading", { level: 1, name: "Something good is coming" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByText("10 of 10 spots remaining")).toBeInTheDocument();
  });

  it("renders the normal CTA shell when waitlist mode is disabled", () => {
    renderHero({ enabled: false, cap: 10, spotsRemaining: 10 });

    expect(
      screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See if we’re a fit" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });

  it("stages the normal hero copy and CTA with entrance animations", () => {
    renderHero({ enabled: false, cap: 10, spotsRemaining: 10 });

    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "ui-public-hero-entrance",
      "ui-public-hero-entrance-delay-0",
    );
    expect(screen.getByText(/Online or in-person coaching/)).toHaveClass(
      "ui-public-hero-entrance",
      "ui-public-hero-entrance-delay-200",
    );
    expect(screen.getByRole("button", { name: "See if we’re a fit" }).parentElement).toHaveClass(
      "ui-public-hero-entrance",
      "ui-public-hero-entrance-pop",
      "ui-public-hero-entrance-delay-400",
    );
  });

  it("stages the waitlist hero content with entrance animations", () => {
    renderHero({ enabled: true, cap: 10, spotsRemaining: 10 });

    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "ui-public-hero-entrance",
      "ui-public-hero-entrance-delay-0",
    );
    expect(screen.getByText(/12-month coaching program/)).toHaveClass(
      "ui-public-hero-entrance",
      "ui-public-hero-entrance-delay-150",
    );
    expect(screen.getByLabelText("Email address").closest(".ui-public-hero-entrance")).toHaveClass(
      "ui-public-hero-entrance-delay-300",
    );
    expect(
      screen.getByText("10 of 10 spots remaining").closest(".ui-public-hero-entrance"),
    ).toHaveClass("ui-public-hero-entrance-delay-450");
    expect(screen.getByText("No spam. Just one email when doors open.")).toHaveClass(
      "ui-public-hero-entrance",
      "ui-public-hero-entrance-fade",
      "ui-public-hero-entrance-delay-600",
    );
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

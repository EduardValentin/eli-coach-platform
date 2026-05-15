// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketingNutrition } from "./nutrition";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubMotionPreference(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    }),
  );
}

function stubAnimationFrame() {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);

    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
}

function setViewportHeight(height: number) {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

function mockNutritionScrollProgress(section: HTMLElement, progress: number) {
  const viewportHeight = 1000;
  const sectionHeight = 2500;
  const scrolledDistance = (sectionHeight - viewportHeight) * progress;

  vi.spyOn(section, "getBoundingClientRect").mockReturnValue({
    bottom: sectionHeight - scrolledDistance,
    height: sectionHeight,
    left: 0,
    right: 1000,
    top: -scrolledDistance,
    width: 1000,
    x: 0,
    y: -scrolledDistance,
    toJSON: () => ({}),
  });
}

function scrollNutritionSection(section: HTMLElement, progress: number) {
  mockNutritionScrollProgress(section, progress);

  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

function renderNutrition(options: { reducedMotion?: boolean } = {}) {
  stubMotionPreference(options.reducedMotion ?? false);
  stubAnimationFrame();
  setViewportHeight(1000);

  render(<MarketingNutrition />);

  return screen.getByRole("region", {
    name: "Your cycle is part of the plan.",
  });
}

describe("MarketingNutrition UI integration", () => {
  it("renders the prototype narrative, cycle wheel, and initial center state", () => {
    const section = renderNutrition();

    expect(within(section).getByText("Nutrition that fits the picture")).toBeInTheDocument();
    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "Your cycle is part of the plan.",
      }),
    ).toBeInTheDocument();
    expect(
      within(section).getByText(
        "Your menstrual cycle changes how you feel, eat, and train through the month. Your plan takes that into account, so you don’t have to.",
      ),
    ).toBeInTheDocument();
    expect(
      within(section).getByText(
        "Your plan handles this for you. You don’t have to remember any of it.",
      ),
    ).toBeInTheDocument();

    const wheel = within(section).getByRole("list", { name: "28-day cycle wheel" });

    expect(within(wheel).getAllByRole("listitem")).toHaveLength(28);
    expect(within(section).getByText("DAY 25")).toBeInTheDocument();
    expect(within(section).getByText("Luteal")).toBeInTheDocument();
    expect(
      within(section).getByText(
        "A few more complex carbs and root veggies to support the wind-down.",
      ),
    ).toBeInTheDocument();
  });

  it("updates the center label as native scroll progress advances and reverses", async () => {
    const section = renderNutrition();

    scrollNutritionSection(section, 17 / 28);

    await waitFor(() => {
      expect(within(section).getByText("DAY 14")).toBeInTheDocument();
    });
    expect(within(section).getByText("Ovulatory")).toBeInTheDocument();
    expect(
      within(section).getByText("Raw veggies, fiber-forward, lighter portions."),
    ).toBeInTheDocument();

    scrollNutritionSection(section, 20 / 28);

    await waitFor(() => {
      expect(within(section).getByText("DAY 17")).toBeInTheDocument();
    });
    expect(within(section).getByText("Luteal")).toBeInTheDocument();

    scrollNutritionSection(section, 0);

    await waitFor(() => {
      expect(within(section).getByText("DAY 25")).toBeInTheDocument();
    });
    expect(within(section).getByText("Luteal")).toBeInTheDocument();
  });

  it("snaps reduced-motion scroll progress through the four phase milestones", async () => {
    const section = renderNutrition({ reducedMotion: true });

    scrollNutritionSection(section, 0.25);

    await waitFor(() => {
      expect(within(section).getByText("DAY 6")).toBeInTheDocument();
    });
    expect(within(section).getByText("Follicular")).toBeInTheDocument();

    scrollNutritionSection(section, 0.5);

    await waitFor(() => {
      expect(within(section).getByText("DAY 14")).toBeInTheDocument();
    });
    expect(within(section).getByText("Ovulatory")).toBeInTheDocument();

    scrollNutritionSection(section, 0.75);

    await waitFor(() => {
      expect(within(section).getByText("DAY 17")).toBeInTheDocument();
    });
    expect(within(section).getByText("Luteal")).toBeInTheDocument();
  });
});

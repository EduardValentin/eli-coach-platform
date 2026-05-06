// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import confetti from "canvas-confetti";

import { launchWaitlistConfetti } from "./waitlist-confetti";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(confetti).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("launchWaitlistConfetti", () => {
  it("uses the same burst configuration as the reference app", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as CanvasRenderingContext2D,
    );

    launchWaitlistConfetti();

    expect(confetti).toHaveBeenCalledWith({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#C81D6B", "#FF4D6D", "#00796B", "#FFD700"],
      disableForReducedMotion: true,
    });
  });

  it("does not launch confetti when canvas rendering is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    launchWaitlistConfetti();

    expect(confetti).not.toHaveBeenCalled();
  });
});

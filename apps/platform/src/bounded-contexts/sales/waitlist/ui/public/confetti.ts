import confetti from "canvas-confetti";

const waitlistConfettiOptions = {
  particleCount: 80,
  spread: 70,
  origin: { y: 0.6 },
  // Decorative particles, never text: WCAG exempts them, so these keep the
  // vivid brand hues rather than the contrast-adjusted palette.
  colors: ["#C81D6B", "#FF4D6D", "#00796B", "#FFD700"],
  disableForReducedMotion: true,
};

export function launchWaitlistConfetti() {
  if (!canRenderConfettiCanvas()) {
    return;
  }

  void confetti(waitlistConfettiOptions);
}

function canRenderConfettiCanvas(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.createElement("canvas").getContext("2d") !== null;
}

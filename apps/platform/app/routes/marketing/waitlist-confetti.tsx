import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

type WaitlistConfettiProps = {
  isVisible: boolean;
};

const confettiColors = ["#C81D6B", "#FF4D6D", "#00796B", "#FFD700"] as const;

const confettiParticles = Array.from({ length: 80 }, (_, index) => ({
  color: confettiColors[index % confettiColors.length],
  delayMs: (index % 8) * 24,
  durationMs: 900 + (index % 6) * 80,
  leftPercent: (index * 37) % 100,
  rotationDeg: (index * 29) % 360,
  sizePx: index % 5 === 0 ? 9 : 7,
  topPercent: 22 + ((index * 17) % 28),
  travelX: ((index % 11) - 5) * 18,
  travelY: 70 + (index % 9) * 16,
}));

export function WaitlistConfetti(props: WaitlistConfettiProps) {
  if (!props.isVisible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
      data-testid="waitlist-confetti"
    >
      {confettiParticles.map((particle, index) => (
        <span
          className="ui-waitlist-confetti-particle absolute"
          key={index}
          style={getConfettiParticleStyle(particle)}
        />
      ))}
    </div>,
    document.body,
  );
}

function getConfettiParticleStyle(
  particle: (typeof confettiParticles)[number],
): CSSProperties {
  return {
    "--waitlist-confetti-color": particle.color,
    "--waitlist-confetti-rotate": `${particle.rotationDeg}deg`,
    "--waitlist-confetti-size": `${particle.sizePx}px`,
    "--waitlist-confetti-travel-x": `${particle.travelX}px`,
    "--waitlist-confetti-travel-y": `${particle.travelY}px`,
    animationDelay: `${particle.delayMs}ms`,
    animationDuration: `${particle.durationMs}ms`,
    left: `${particle.leftPercent}%`,
    top: `${particle.topPercent}%`,
  } as CSSProperties;
}

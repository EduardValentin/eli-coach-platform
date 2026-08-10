import {
  cn,
  marketingEase,
  marketingViewportOnce,
  SectionEyebrow,
  useClientReducedMotionPreference,
} from "@eli-coach-platform/ui";
import { motion } from "motion/react";
import { useState } from "react";

const MY_METHOD_PILLARS = [
  "You’ll learn how your body works, so your training makes sense.",
  "Whether you have an active menstrual cycle or not, your plan is still personalized around your body, energy, lifestyle, and goals.",
  "You’ll get weekly support, workout reviews, and plan adjustments based on your progress, energy, and schedule.",
] as const;

const WITH_COACH_PATH = "M 40 200 C 100 180, 180 70, 360 50";
const ON_YOUR_OWN_PATH = "M 40 200 C 130 195, 240 145, 360 120";

function ProgressGraph() {
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const prefersReducedMotion = useClientReducedMotionPreference();
  const isGraphRevealed = hasEnteredViewport || prefersReducedMotion;

  return (
    <motion.figure
      animate={prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
      className="rounded-panel border border-border-subtle bg-surface-base p-6 shadow-raised md:p-8"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      onViewportEnter={() => setHasEnteredViewport(true)}
      transition={{ duration: 0.6, ease: marketingEase }}
      viewport={marketingViewportOnce}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
    >
      <figcaption className="mb-5">
        <p className="mb-1 text-public-my-method-overline font-bold tracking-section-eyebrow text-text-muted uppercase">
          Progress, side by side
        </p>
        <h3 className="font-heading text-public-my-method-figure-heading font-medium text-text-primary">
          Faster results, fewer plateaus.
        </h3>
        <p className="ui-sr-only">
          The with-coach curve climbs faster and reaches higher than the on-your-own curve over six
          months.
        </p>
      </figcaption>

      <div
        className="group relative aspect-[5/3] w-full overflow-visible"
        data-visible={isGraphRevealed || undefined}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 400 240"
        >
          <line
            stroke="var(--color-border-subtle)"
            strokeDasharray="3 4"
            strokeWidth="1.5"
            x1="40"
            x2="360"
            y1="220"
            y2="220"
          />
          <line
            stroke="var(--color-border-subtle)"
            strokeDasharray="3 4"
            strokeWidth="1.5"
            x1="40"
            x2="40"
            y1="20"
            y2="220"
          />
          <path
            className={cn(
              "transition-[clip-path] delay-[600ms] duration-1000 ease-in-out motion-reduce:transition-none",
              {
                "[clip-path:inset(-4px_0%_-4px_-4px)]": isGraphRevealed,
                "[clip-path:inset(-4px_100%_-4px_-4px)]": !isGraphRevealed,
              },
            )}
            d={ON_YOUR_OWN_PATH}
            fill="none"
            stroke="var(--color-text-muted)"
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeOpacity="0.55"
            strokeWidth="2.5"
          />
          <path
            className={cn(
              "transition-[stroke-dashoffset] delay-[800ms] duration-1000 ease-in-out motion-reduce:transition-none",
              {
                "[stroke-dashoffset:0]": isGraphRevealed,
                "[stroke-dashoffset:500]": !isGraphRevealed,
              },
            )}
            d={WITH_COACH_PATH}
            fill="none"
            stroke="var(--color-brand-primary)"
            strokeDasharray="500"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <circle
            className={cn(
              "origin-[40px_200px] transition-[opacity,transform] delay-500 duration-300 ease-in-out motion-reduce:transition-none",
              {
                "scale-0 opacity-0": !isGraphRevealed,
                "scale-100 opacity-100": isGraphRevealed,
              },
            )}
            cx="40"
            cy="200"
            fill="var(--color-surface-base)"
            r="5"
            stroke="var(--color-brand-primary)"
            strokeWidth="2"
          />
          <circle
            className={cn(
              "origin-[360px_50px] transition-[opacity,transform] delay-[1800ms] duration-300 ease-in-out motion-reduce:transition-none",
              {
                "scale-0 opacity-0": !isGraphRevealed,
                "scale-100 opacity-100": isGraphRevealed,
              },
            )}
            cx="360"
            cy="50"
            fill="var(--color-surface-base)"
            r="6"
            stroke="var(--color-brand-primary)"
            strokeWidth="2.5"
          />
          <circle
            className={cn(
              "origin-[360px_120px] transition-[opacity,transform] delay-[1600ms] duration-300 ease-in-out motion-reduce:transition-none",
              {
                "scale-0 opacity-0": !isGraphRevealed,
                "scale-100 opacity-100": isGraphRevealed,
              },
            )}
            cx="360"
            cy="120"
            fill="var(--color-surface-base)"
            r="5"
            stroke="var(--color-text-muted)"
            strokeOpacity="0.55"
            strokeWidth="2"
          />
        </svg>

        <span
          className="absolute top-[14%] right-0 -translate-y-1/2 text-xs font-semibold whitespace-nowrap text-brand-primary opacity-0 transition-opacity delay-[1900ms] duration-[400ms] ease-in-out group-data-[visible]:opacity-100 motion-reduce:transition-none md:text-sm"
        >
          With your coach
        </span>
        <span
          className="absolute top-[55%] right-0 text-xs font-medium whitespace-nowrap text-text-muted opacity-0 transition-opacity delay-[1700ms] duration-[400ms] ease-in-out group-data-[visible]:opacity-100 motion-reduce:transition-none md:text-sm"
        >
          On your own
        </span>
        <span className="absolute -bottom-1 left-2 text-public-my-method-axis-label font-medium text-text-muted">
          Month 1
        </span>
        <span className="absolute right-[14%] -bottom-1 text-public-my-method-axis-label font-medium text-text-muted">
          Month 6
        </span>
      </div>
    </motion.figure>
  );
}

export function MarketingMyMethod() {
  return (
    <section
      aria-label="Why progress is easier with support."
      className="overflow-hidden bg-surface-base py-20 lg:py-28"
    >
      <div className="mx-auto grid w-full max-w-stage grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-2 lg:gap-20 lg:px-24">
        <div>
          <SectionEyebrow>My method</SectionEyebrow>
          <h2 className="mb-8 font-heading text-3xl leading-public-my-method-heading font-medium text-text-primary md:text-4xl lg:text-5xl">
            Why progress is easier with support.
          </h2>

          <ol className="space-y-3.5">
            {MY_METHOD_PILLARS.map((pillar, index) => (
              <li className="flex items-start gap-3 text-body-base text-text-primary" key={pillar}>
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill bg-brand-primary-soft text-label font-bold text-brand-primary tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="leading-copy-relaxed">{pillar}</span>
              </li>
            ))}
          </ol>
        </div>

        <ProgressGraph />
      </div>
    </section>
  );
}

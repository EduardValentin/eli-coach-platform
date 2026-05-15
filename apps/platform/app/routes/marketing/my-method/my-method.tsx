import { SectionEyebrow, useHasEnteredViewport } from "@eli-coach-platform/ui";
import { useEffect, useId, useState } from "react";

import "./my-method.animation.css";

const METHOD_PILLARS = [
  "Eli teaches you how a woman’s body actually works — so your training makes sense, not just your schedule.",
  "No active cycle? Your plan still fits. Eli coaches you the same way.",
  "Eli reviews your workouts, listens to how you’re feeling, and adjusts the plan week by week.",
] as const;

const WITH_COACH_PATH = "M 40 200 C 100 180, 180 70, 360 50";
const ON_YOUR_OWN_PATH = "M 40 200 C 130 195, 240 145, 360 120";

type ProgressGraphProps = {
  entryState: "entered" | "pending" | undefined;
};

function ProgressGraph(props: ProgressGraphProps) {
  const graphTitleId = useId();
  const graphDescriptionId = useId();

  return (
    <figure
      aria-describedby={graphDescriptionId}
      aria-labelledby={graphTitleId}
      className="ui-public-my-method-graph rounded-panel border bg-surface-base p-6 md:p-8"
      data-entry-state={props.entryState}
    >
      <figcaption className="mb-5">
        <p className="ui-public-my-method-graph-eyebrow mb-1 font-body text-text-muted uppercase">
          Progress, side by side
        </p>
        <h3 className="font-heading text-xl font-medium text-text-primary" id={graphTitleId}>
          Faster results, fewer plateaus.
        </h3>
        <p className="ui-sr-only" id={graphDescriptionId}>
          A line graph comparing two progress curves over six months. The solid brand-colored
          curve labeled &quot;With your coach&quot; climbs steeper and reaches a higher point than
          the dashed gray curve labeled &quot;On your own&quot;.
        </p>
      </figcaption>

      <div className="ui-public-my-method-graph-canvas relative w-full">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 400 240"
        >
          <line className="ui-public-my-method-axis" x1="40" x2="360" y1="220" y2="220" />
          <line className="ui-public-my-method-axis" x1="40" x2="40" y1="20" y2="220" />
          <path
            className="ui-public-my-method-curve ui-public-my-method-curve-muted"
            d={ON_YOUR_OWN_PATH}
            fill="none"
          />
          <path
            className="ui-public-my-method-curve ui-public-my-method-curve-brand"
            d={WITH_COACH_PATH}
            fill="none"
          />
          <circle
            className="ui-public-my-method-point ui-public-my-method-point-brand"
            cx="40"
            cy="200"
            r="5"
          />
          <circle
            className="ui-public-my-method-point ui-public-my-method-point-brand ui-public-my-method-point-brand-end"
            cx="360"
            cy="50"
            r="6"
          />
          <circle
            className="ui-public-my-method-point ui-public-my-method-point-muted"
            cx="360"
            cy="120"
            r="5"
          />
        </svg>

        <span className="ui-public-my-method-label ui-public-my-method-label-coach absolute whitespace-nowrap text-brand-primary">
          With your coach
        </span>
        <span className="ui-public-my-method-label ui-public-my-method-label-alone absolute whitespace-nowrap text-text-muted">
          On your own
        </span>
        <span className="ui-public-my-method-axis-label ui-public-my-method-axis-label-start absolute text-text-muted">
          Month 1
        </span>
        <span className="ui-public-my-method-axis-label ui-public-my-method-axis-label-end absolute text-text-muted">
          Month 6
        </span>
      </div>
    </figure>
  );
}

export function MarketingMyMethod() {
  const headingId = useId();
  const [isEntranceEnhanced, setIsEntranceEnhanced] = useState(false);
  const { hasEnteredViewport, ref } = useHasEnteredViewport<HTMLElement>();
  const entryState = isEntranceEnhanced ? (hasEnteredViewport ? "entered" : "pending") : undefined;

  useEffect(() => {
    setIsEntranceEnhanced(true);
  }, []);

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden bg-surface-base py-20 lg:py-28"
      ref={ref}
    >
      <div className="mx-auto w-full max-w-stage px-6 md:px-12 lg:px-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div
            className="ui-public-my-method-entry motion-reduce:transform-none"
            data-entry-state={entryState}
          >
            <SectionEyebrow>My method</SectionEyebrow>
            <h2
              className="ui-public-my-method-heading font-heading text-3xl font-medium text-text-primary md:text-4xl lg:text-5xl"
              id={headingId}
            >
              Why progress comes faster together.
            </h2>

            <ol aria-label="Coaching method pillars" className="space-y-3.5">
              {METHOD_PILLARS.map((pillar, index) => (
                <li className="flex items-start gap-3 text-body-base text-text-primary" key={pillar}>
                  <span aria-hidden="true" className="ui-public-my-method-number">
                    {index + 1}
                  </span>
                  <span className="leading-copy-relaxed">{pillar}</span>
                </li>
              ))}
            </ol>
          </div>

          <ProgressGraph entryState={entryState} />
        </div>
      </div>
    </section>
  );
}

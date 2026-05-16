import {
  cn,
  SectionEyebrow,
  usePrefersReducedMotion,
} from "@eli-coach-platform/ui";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import {
  CYCLE_NUTRITION_DAYS,
  CYCLE_NUTRITION_DEGREES_PER_DAY,
  getCycleNutritionViewState,
  getPillPresentation,
} from "./cycle-nutrition-content";
import "./cycle-nutrition.css";

type CycleNutritionStyle = CSSProperties & {
  "--cycle-nutrition-wheel-rotation": string;
};

type PillStyle = CSSProperties & {
  "--cycle-nutrition-pill-color": string;
  "--cycle-nutrition-pill-opacity": number;
};

function getSectionProgress(section: HTMLElement) {
  const rect = section.getBoundingClientRect();
  const scrollableDistance = Math.max(rect.height - window.innerHeight, 1);

  return Math.min(Math.max(-rect.top / scrollableDistance, 0), 1);
}

function useCycleNutritionScrollProgress() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    let frameId: number | null = null;

    const updateProgress = () => {
      frameId = null;
      setProgress(getSectionProgress(section));
    };

    const requestProgressUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", requestProgressUpdate);
      window.removeEventListener("resize", requestProgressUpdate);
    };
  }, []);

  return { progress, sectionRef };
}

export function MarketingCycleNutrition() {
  const headingId = useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { progress, sectionRef } = useCycleNutritionScrollProgress();
  const viewState = getCycleNutritionViewState({ prefersReducedMotion, progress });
  const sectionStyle: CycleNutritionStyle = {
    "--cycle-nutrition-wheel-rotation": `${viewState.rotationDegrees}deg`,
  };

  return (
    <section
      aria-labelledby={headingId}
      className="ui-public-cycle-nutrition relative bg-surface-page"
      ref={sectionRef}
      style={sectionStyle}
    >
      <div className="ui-public-cycle-nutrition-sticky sticky top-0 flex min-h-screen items-center overflow-hidden pt-20 pb-10 lg:pt-24 lg:pb-14">
        <div className="mx-auto grid w-full max-w-stage grid-cols-1 items-center gap-10 px-6 md:px-12 lg:grid-cols-2 lg:gap-16 lg:px-24">
          <div className="relative z-10 flex w-full flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex w-full max-w-lg flex-col items-center lg:items-start">
              <SectionEyebrow>Nutrition that fits the picture</SectionEyebrow>
              <h2
                className="font-heading text-3xl leading-tight font-medium text-text-primary md:text-4xl lg:text-5xl"
                id={headingId}
              >
                Your cycle is part of the plan.
              </h2>
              <p className="mt-5 max-w-md text-body-base leading-copy-relaxed text-text-secondary md:text-body-lg">
                Your menstrual cycle changes how you feel, eat, and train through the month. Your plan takes that into account, so you don’t have to.
              </p>
              <p className="mt-6 max-w-md text-body-sm leading-copy-relaxed font-medium text-text-primary">
                Your plan handles this for you. You don’t have to remember any of it.
              </p>
            </div>
          </div>

          <div className="mt-10 flex w-full items-center justify-center lg:mt-0">
            <div className="ui-public-cycle-nutrition-wheel-shell relative aspect-square w-full">
              <div className="ui-public-cycle-nutrition-indicator-wrap absolute left-1/2 z-30 -translate-x-1/2">
                <div
                  aria-hidden="true"
                  className={cn(
                    "ui-public-cycle-nutrition-indicator h-7 w-1 rounded-pill",
                    viewState.phase.tokenClassName.background,
                  )}
                />
              </div>

              <div className="relative size-full rounded-pill">
                <div
                  aria-hidden="true"
                  className="ui-public-cycle-nutrition-wheel absolute inset-0 rounded-pill"
                >
                  {CYCLE_NUTRITION_DAYS.map((day) => {
                    const angle = (day - 1) * CYCLE_NUTRITION_DEGREES_PER_DAY;
                    const pill = getPillPresentation(day, viewState.activeDay);
                    const pillStyle: PillStyle = {
                      "--cycle-nutrition-pill-color": pill.tokenVariable,
                      "--cycle-nutrition-pill-opacity": pill.opacity,
                      transform: `rotate(${angle}deg)`,
                    };

                    return (
                      <div
                        className="absolute top-0 left-0 h-1/2 w-full origin-bottom"
                        key={day}
                        style={pillStyle}
                      >
                        <div className="absolute top-1 left-1/2 -translate-x-1/2">
                          <span
                            className={cn(
                              "ui-public-cycle-nutrition-day-pill flex flex-col items-center justify-start border border-surface-base/60 bg-surface-subtle p-1",
                              {
                                "ui-public-cycle-nutrition-day-pill-current": pill.isCurrent,
                                "ui-public-cycle-nutrition-day-pill-muted": !pill.isCurrent,
                                "ui-public-cycle-nutrition-day-pill-striped": pill.isStriped,
                              },
                            )}
                          >
                            <span className="ui-public-cycle-nutrition-day-dot" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ui-public-cycle-nutrition-center absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-pill bg-surface-base p-8 text-center shadow-floating">
                  <p className="text-label font-bold tracking-section-eyebrow text-text-muted uppercase">
                    DAY {viewState.activeDay}
                  </p>
                  <p
                    className={cn(
                      "mt-4 font-heading text-4xl leading-tight font-medium md:text-5xl",
                      viewState.phase.tokenClassName.text,
                    )}
                  >
                    {viewState.phase.name}
                  </p>
                  <p className="ui-public-cycle-nutrition-cue mt-3 text-body-sm leading-snug font-medium text-text-secondary">
                    {viewState.phase.cue}
                  </p>
                  <p className="ui-sr-only">{viewState.phase.daysLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

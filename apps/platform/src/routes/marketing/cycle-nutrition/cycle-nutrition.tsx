import { cn, SectionEyebrow } from "@eli-coach-platform/ui";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  type Transition,
} from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  CYCLE_NUTRITION_DAYS,
  CYCLE_NUTRITION_DEGREES_PER_DAY,
  getCycleNutritionViewState,
  getPillPresentation,
} from "./cycle-nutrition-content";
import { useClientReducedMotionPreference } from "../marketing-motion";
import "./cycle-nutrition.css";

type PillStyle = CSSProperties & {
  "--cycle-nutrition-pill-color": string;
};

function getCycleMotionTransition(prefersReducedMotion: boolean): Transition {
  return {
    duration: prefersReducedMotion ? 0 : 0.3,
    ease: [0.25, 0.1, 0.25, 1] as const,
  };
}

export function MarketingCycleNutrition() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useClientReducedMotionPreference();
  const { scrollYProgress } = useScroll({
    offset: ["start start", "end end"],
    target: sectionRef,
  });
  const wheelRotation = useMotionValue(
    getCycleNutritionViewState({ prefersReducedMotion: false, progress: 0 }).rotationDegrees,
  );
  const [viewState, setViewState] = useState(() =>
    getCycleNutritionViewState({ prefersReducedMotion: false, progress: 0 }),
  );
  const transition = getCycleMotionTransition(prefersReducedMotion);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const nextViewState = getCycleNutritionViewState({ prefersReducedMotion, progress });

    wheelRotation.set(nextViewState.rotationDegrees);
    setViewState(nextViewState);
  });

  useEffect(() => {
    const nextViewState = getCycleNutritionViewState({
      prefersReducedMotion,
      progress: scrollYProgress.get(),
    });

    wheelRotation.set(nextViewState.rotationDegrees);
    setViewState(nextViewState);
  }, [prefersReducedMotion, scrollYProgress, wheelRotation]);

  return (
    <section
      aria-label="Your cycle is part of the plan."
      className="relative min-h-[250vh] bg-surface-page"
      ref={sectionRef}
    >
      <div className="ui-public-cycle-nutrition-sticky sticky top-0 flex min-h-screen items-center overflow-hidden pt-20 pb-10 lg:pt-24 lg:pb-14">
        <div className="mx-auto grid w-full max-w-stage grid-cols-1 items-center gap-10 px-6 md:px-12 lg:grid-cols-2 lg:gap-16 lg:px-24">
          <div className="relative z-10 flex w-full flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex w-full max-w-lg flex-col items-center lg:items-start">
              <SectionEyebrow>Nutrition that fits the picture</SectionEyebrow>
              <h2
                className="font-heading text-3xl leading-tight font-medium text-text-primary md:text-4xl lg:text-5xl"
              >
                Your cycle is part of the plan.
              </h2>
              <p className="mt-5 max-w-md text-body-base leading-copy-relaxed text-text-secondary md:text-body-lg">
                Your menstrual cycle can influence your energy, appetite, training, and recovery. Your nutrition plan takes that into account, so you feel supported without having to overthink it.
              </p>
            </div>
          </div>

          <div className="mt-10 flex w-full items-center justify-center lg:mt-0">
            <div className="ui-public-cycle-nutrition-wheel-shell relative aspect-square w-full">
              <div className="ui-public-cycle-nutrition-indicator-wrap absolute left-1/2 z-30 -translate-x-1/2">
                <motion.div
                  animate={{ backgroundColor: viewState.phase.tokenVariable }}
                  aria-hidden="true"
                  className="ui-public-cycle-nutrition-indicator h-7 w-1 rounded-pill"
                  transition={transition}
                />
              </div>

              <div className="relative size-full rounded-pill">
                <motion.div
                  aria-hidden="true"
                  className="ui-public-cycle-nutrition-wheel absolute inset-0 rounded-pill"
                  style={{ rotate: wheelRotation }}
                >
                  {CYCLE_NUTRITION_DAYS.map((day) => {
                    const angle = (day - 1) * CYCLE_NUTRITION_DEGREES_PER_DAY;
                    const pill = getPillPresentation(day, viewState.activeDay);
                    const pillStyle: PillStyle = {
                      "--cycle-nutrition-pill-color": pill.tokenVariable,
                      transform: `rotate(${angle}deg)`,
                    };

                    return (
                      <div
                        className="absolute top-0 left-0 h-1/2 w-full origin-bottom"
                        key={day}
                        style={pillStyle}
                      >
                        <div className="absolute top-1 left-1/2 -translate-x-1/2">
                          <motion.span
                            animate={{
                              boxShadow: pill.isCurrent ? "var(--shadow-soft)" : "none",
                              height: pill.isCurrent ? "var(--space-9)" : "3.25rem",
                              marginTop: pill.isCurrent ? "0rem" : "calc(var(--spacing) * 1.5)",
                              width: pill.isCurrent ? "var(--size-control-sm)" : "var(--space-7)",
                            }}
                            className={cn(
                              "ui-public-cycle-nutrition-day-pill flex flex-col items-center justify-start border border-border-soft bg-surface-subtle p-1",
                              {
                                "ui-public-cycle-nutrition-day-pill-current": pill.isCurrent,
                                "ui-public-cycle-nutrition-day-pill-muted": !pill.isCurrent,
                                "ui-public-cycle-nutrition-day-pill-striped": pill.isStriped,
                              },
                            )}
                            initial={false}
                            transition={transition}
                          >
                            <motion.span
                              animate={{
                                height: pill.isCurrent ? "1.875rem" : "var(--space-6)",
                                opacity: pill.opacity,
                                width: pill.isCurrent ? "1.875rem" : "var(--space-6)",
                              }}
                              className="ui-public-cycle-nutrition-day-dot"
                              initial={false}
                              transition={transition}
                            />
                          </motion.span>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

                <div className="ui-public-cycle-nutrition-center absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-pill bg-surface-base p-8 text-center shadow-floating">
                  <p className="text-label font-bold tracking-section-eyebrow text-text-muted uppercase">
                    DAY {viewState.activeDay}
                  </p>
                  <motion.p
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "mt-4 font-heading text-4xl leading-tight font-medium md:text-5xl",
                      viewState.phase.tokenClassName.text,
                    )}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                    key={`${viewState.phase.id}-name`}
                    transition={transition}
                  >
                    {viewState.phase.name}
                  </motion.p>
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="ui-public-cycle-nutrition-cue mt-3 text-body-sm leading-snug font-medium text-text-secondary"
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    key={`${viewState.phase.id}-cue`}
                    transition={transition}
                  >
                    {viewState.phase.cue}
                  </motion.p>
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

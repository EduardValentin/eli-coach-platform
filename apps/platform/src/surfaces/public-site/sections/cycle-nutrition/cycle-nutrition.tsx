import { cn } from "@eli-coach-platform/ui/lib";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import { SectionEyebrow } from "@eli-coach-platform/ui/primitives";
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
  getAnchoredCycleViewState,
  getScrollingCycleViewState,
  getPillPresentation,
} from "./cycle-nutrition-content";
import "./cycle-nutrition.css";

type PillStyle = CSSProperties & {
  "--cycle-nutrition-pill-color": string;
};

const CYCLE_TRANSITION: Transition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1],
};

const INSTANT_CYCLE_TRANSITION: Transition = {
  ...CYCLE_TRANSITION,
  duration: 0,
};

export function PublicCycleNutrition() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useClientReducedMotionPreference();
  const { scrollYProgress } = useScroll({
    offset: ["start start", "end end"],
    target: sectionRef,
  });
  const wheelRotation = useMotionValue(
    getScrollingCycleViewState(0).rotationDegrees,
  );
  const [viewState, setViewState] = useState(() =>
    getScrollingCycleViewState(0),
  );
  const transition = prefersReducedMotion
    ? INSTANT_CYCLE_TRANSITION
    : CYCLE_TRANSITION;
  const viewStateAt = prefersReducedMotion
    ? getAnchoredCycleViewState
    : getScrollingCycleViewState;

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const nextViewState = viewStateAt(progress);

    wheelRotation.set(nextViewState.rotationDegrees);
    setViewState(nextViewState);
  });

  useEffect(() => {
    const nextViewState = viewStateAt(scrollYProgress.get());

    wheelRotation.set(nextViewState.rotationDegrees);
    setViewState(nextViewState);
  }, [scrollYProgress, viewStateAt, wheelRotation]);

  return (
    <section
      aria-label="Your cycle is part of the plan."
      className="ui-public-cycle-nutrition relative h-[250vh] bg-surface-page"
      ref={sectionRef}
    >
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden pt-20 pb-10 lg:pt-24 lg:pb-14">
        <div className="mx-auto grid w-full max-w-stage grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16 lg:px-24">
          <div className="relative z-10 flex w-full flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex w-full max-w-lg flex-col items-center lg:items-start">
              <SectionEyebrow>Nutrition that fits the picture</SectionEyebrow>
              <h2 className="mb-5 font-heading text-3xl leading-display-snug font-medium text-text-primary md:text-4xl lg:text-5xl">
                Your cycle is part of the plan.
              </h2>
              <p className="max-w-md text-base leading-relaxed text-copy-muted md:text-lg">
                Your menstrual cycle can influence your energy, appetite,
                training, and recovery. Your nutrition plan takes that into
                account, so you feel supported without having to overthink it.
              </p>
            </div>
          </div>

          <div className="mt-10 flex w-full items-center justify-center lg:mt-0">
            <div className="ui-public-cycle-nutrition-wheel-shell relative aspect-square w-full">
              <div className="ui-public-cycle-nutrition-indicator-wrap absolute left-1/2 z-30 -translate-x-1/2">
                <motion.div
                  animate={{ backgroundColor: viewState.phase.tokenVariable }}
                  aria-hidden="true"
                  className="h-7 w-1 rounded-full"
                  transition={transition}
                />
              </div>

              <div className="relative size-full rounded-full">
                <motion.div
                  aria-hidden="true"
                  className="ui-public-cycle-nutrition-wheel absolute inset-0 rounded-full"
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
                              height: pill.isCurrent
                                ? "var(--space-9)"
                                : "3.25rem",
                              marginTop: pill.isCurrent
                                ? "0rem"
                                : "calc(var(--spacing) * 1.5)",
                              width: pill.isCurrent
                                ? "var(--size-control-sm)"
                                : "var(--space-7)",
                            }}
                            className={cn(
                              "ui-public-cycle-nutrition-day-pill flex flex-col items-center justify-start border border-surface-base/60 bg-surface-subtle p-1 transition-shadow duration-300",
                              {
                                "shadow-(--cycle-nutrition-pill-shadow)":
                                  pill.isCurrent,
                                "ui-public-cycle-nutrition-day-pill-striped":
                                  pill.isStriped,
                              },
                            )}
                            initial={false}
                            transition={transition}
                          >
                            <motion.span
                              animate={{
                                height: pill.isCurrent
                                  ? "1.875rem"
                                  : "var(--space-6)",
                                opacity: pill.opacity,
                                width: pill.isCurrent
                                  ? "1.875rem"
                                  : "var(--space-6)",
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

                <div className="ui-public-cycle-nutrition-center pointer-events-none absolute shadow-(--cycle-nutrition-center-shadow) top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-surface-base p-8 text-center">
                  <span className="mb-4 text-xs leading-normal font-bold tracking-section-eyebrow text-text-muted uppercase">
                    DAY {viewState.activeDay}
                  </span>
                  <motion.h3
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "mb-3 font-heading text-4xl leading-normal font-medium motion-reduce:transform-none md:text-public-cycle-phase",
                      viewState.phase.tokenClassName.text,
                    )}
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }
                    }
                    key={`${viewState.phase.id}-name`}
                    transition={transition}
                  >
                    {viewState.phase.name}
                  </motion.h3>
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="ui-public-cycle-nutrition-cue leading-snug font-medium text-copy-muted md:text-sm"
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

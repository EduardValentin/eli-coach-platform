import { cn, SectionEyebrow, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import type { CSSProperties, RefObject } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  CYCLE_NUTRITION_PROTOTYPE_START_DAY,
  cycleNutritionDays,
  cycleNutritionPhaseMilestones,
  getCycleNutritionDayForProgress,
  getCycleNutritionMilestoneForProgress,
  type CycleNutritionDay,
  type CycleNutritionPhase,
} from "./nutrition-content";

const DEGREES_PER_CYCLE_DAY = 360 / cycleNutritionDays.length;
const CYCLE_NUTRITION_INITIAL_ROTATION =
  -(CYCLE_NUTRITION_PROTOTYPE_START_DAY - 1) * DEGREES_PER_CYCLE_DAY;

type CycleNutritionComponentStyle = CSSProperties & {
  "--cycle-nutrition-center-copy": string;
  "--cycle-nutrition-center-label": string;
  "--cycle-nutrition-pill-surface": string;
};

const CYCLE_NUTRITION_COMPONENT_STYLE: CycleNutritionComponentStyle = {
  "--cycle-nutrition-center-copy": "#4a5568",
  "--cycle-nutrition-center-label": "#8e9bb0",
  "--cycle-nutrition-pill-surface": "#efeff0",
};

type CycleNutritionPillPresentation = {
  isStriped: boolean;
  opacity: number;
  tokenVariableName: string;
};

export function MarketingNutrition() {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const scrollProgress = useCycleNutritionScrollProgress(sectionRef);
  const activeDay = prefersReducedMotion
    ? getCycleNutritionMilestoneForProgress(scrollProgress)
    : getCycleNutritionDayForProgress(scrollProgress);
  const wheelRotation = prefersReducedMotion
    ? 0
    : CYCLE_NUTRITION_INITIAL_ROTATION + scrollProgress * -360;

  return (
    <section
      aria-labelledby={headingId}
      className="relative h-[250vh] bg-surface-page"
      ref={sectionRef}
      style={CYCLE_NUTRITION_COMPONENT_STYLE}
    >
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-20 lg:py-24">
        <div className="mx-auto grid w-full max-w-stage grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16 lg:px-24">
          <div className="relative z-10 flex w-full flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex w-full max-w-lg flex-col items-center lg:items-start">
              <SectionEyebrow>Nutrition that fits the picture</SectionEyebrow>
              <h2
                className="mb-5 font-heading text-3xl font-medium leading-tight text-text-primary md:text-4xl lg:text-5xl"
                id={headingId}
              >
                Your cycle is part of the plan.
              </h2>
              <p className="mb-6 max-w-md text-body-base leading-relaxed text-text-secondary md:text-lg">
                Your menstrual cycle changes how you feel, eat, and train through the
                month. Your plan takes that into account, so you don’t have to.
              </p>
              <p className="max-w-md text-body-sm font-medium leading-relaxed text-text-primary">
                Your plan handles this for you. You don’t have to remember any of it.
              </p>
            </div>
          </div>

          <figure className="mt-10 flex w-full items-center justify-center lg:mt-0">
            <div className="relative aspect-square w-full max-w-[500px]">
              <div className="absolute top-[-18px] left-1/2 z-30 -translate-x-1/2">
                <span
                  aria-hidden="true"
                  className="block h-[28px] w-[4px] rounded-pill transition-colors duration-300 motion-reduce:transition-none"
                  style={{ backgroundColor: `var(${activeDay.tokenVariableName})` }}
                />
              </div>

              <div className="relative size-full rounded-pill">
                <ol
                  aria-label="28-day cycle wheel"
                  className="absolute inset-0 rounded-pill transition-transform duration-100 ease-linear motion-reduce:transition-none"
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  {cycleNutritionDays.map((day) => (
                    <CycleNutritionDayPill
                      activeDay={activeDay.day}
                      day={day}
                      key={day.day}
                    />
                  ))}
                </ol>

                <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex size-[62%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-pill bg-surface-base p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
                  <span className="mb-4 text-label font-bold uppercase tracking-section-eyebrow text-[var(--cycle-nutrition-center-label)]">
                    DAY {activeDay.day}
                  </span>
                  <h3
                    className="mb-3 font-heading text-[36px] font-medium md:text-[44px]"
                    style={{ color: `var(${activeDay.tokenVariableName})` }}
                  >
                    {getCycleNutritionActiveTitle(activeDay)}
                  </h3>
                  <p className="max-w-[220px] text-[13px] leading-snug font-medium text-[var(--cycle-nutrition-center-copy)] md:text-[14px]">
                    {activeDay.cue}
                  </p>
                </div>
              </div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}

function getCycleNutritionActiveTitle(day: CycleNutritionDay | CycleNutritionPhase) {
  return "phaseTitle" in day ? day.phaseTitle : day.title;
}

function CycleNutritionDayPill(props: { activeDay: number; day: CycleNutritionDay }) {
  const isCurrent = props.day.day === props.activeDay;
  const presentation = getCycleNutritionPillPresentation(props.day);

  return (
    <li
      aria-current={isCurrent ? "step" : undefined}
      aria-label={`Day ${props.day.day}: ${props.day.phaseTitle}`}
      className="absolute top-0 left-0 h-1/2 w-full origin-bottom"
      style={{ transform: `rotate(${(props.day.day - 1) * DEGREES_PER_CYCLE_DAY}deg)` }}
    >
      <div className="absolute top-1 left-1/2 -translate-x-1/2">
        <div
          className={cn(
            "flex flex-col items-center justify-start rounded-[24px] border border-surface-base/60 bg-[var(--cycle-nutrition-pill-surface)] p-1 transition-[height,margin,width,box-shadow] duration-300 motion-reduce:transition-none",
            {
              "h-[52px] w-[32px] mt-1.5": !isCurrent,
              "h-[64px] w-[40px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]": isCurrent,
            },
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 block rounded-pill transition-[height,width,opacity] duration-300 motion-reduce:transition-none",
              {
                "h-[24px] w-[24px]": !isCurrent,
                "h-[30px] w-[30px]": isCurrent,
              },
            )}
            style={getCycleNutritionPillFillStyle(presentation)}
          />
        </div>
      </div>
    </li>
  );
}

function getCycleNutritionPillPresentation(
  day: CycleNutritionDay,
): CycleNutritionPillPresentation {
  const menstrualTokenVariableName = cycleNutritionPhaseMilestones[0].tokenVariableName;

  if (day.day >= 1 && day.day <= 5) {
    return {
      isStriped: false,
      opacity: 1 - (day.day - 1) * 0.1,
      tokenVariableName: menstrualTokenVariableName,
    };
  }

  if (day.day >= 23 && day.day <= 28) {
    return {
      isStriped: true,
      opacity: 0.3 + (day.day - 23) * 0.12,
      tokenVariableName: menstrualTokenVariableName,
    };
  }

  if (day.day >= 6 && day.day <= 8) {
    return {
      isStriped: true,
      opacity: 0.5 - (day.day - 6) * 0.15,
      tokenVariableName: menstrualTokenVariableName,
    };
  }

  return {
    isStriped: false,
    opacity: 0.12,
    tokenVariableName: day.tokenVariableName,
  };
}

function getCycleNutritionPillFillStyle(
  presentation: CycleNutritionPillPresentation,
): CSSProperties {
  const phaseColor = `var(${presentation.tokenVariableName})`;

  return {
    backgroundColor: presentation.isStriped ? "transparent" : phaseColor,
    backgroundImage: presentation.isStriped
      ? `repeating-linear-gradient(-45deg, ${phaseColor} 0px, ${phaseColor} 2px, transparent 2px, transparent 5px)`
      : "none",
    opacity: presentation.opacity,
  };
}

function useCycleNutritionScrollProgress(sectionRef: RefObject<HTMLElement | null>) {
  const animationFrameIdRef = useRef<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const syncScrollProgress = useCallback(() => {
    if (!sectionRef.current) {
      return;
    }

    setScrollProgress(readCycleNutritionScrollProgress(sectionRef.current));
  }, [sectionRef]);

  const scheduleScrollProgressSync = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      window.cancelAnimationFrame(animationFrameIdRef.current);
    }

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      animationFrameIdRef.current = null;
      syncScrollProgress();
    });
  }, [syncScrollProgress]);

  useEffect(() => {
    syncScrollProgress();
    window.addEventListener("resize", scheduleScrollProgressSync);
    window.addEventListener("scroll", scheduleScrollProgressSync, { passive: true });

    return () => {
      window.removeEventListener("resize", scheduleScrollProgressSync);
      window.removeEventListener("scroll", scheduleScrollProgressSync);

      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [scheduleScrollProgressSync, syncScrollProgress]);

  return scrollProgress;
}

function readCycleNutritionScrollProgress(section: HTMLElement) {
  const sectionRect = section.getBoundingClientRect();
  const viewportHeight = window.innerHeight || sectionRect.height;
  const scrollableDistance = Math.max(sectionRect.height - viewportHeight, 1);

  return Math.min(Math.max(-sectionRect.top / scrollableDistance, 0), 1);
}

import { PhoneFrame } from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  publicEase,
  publicSectionRevealViewport,
} from "@eli-coach-platform/ui/motion";
import { SectionEyebrow } from "@eli-coach-platform/ui/primitives";
import { Calendar, Check, Utensils } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentType } from "react";
import { useEffect, useId, useRef, useState } from "react";

import {
  CAPABILITIES,
  CYCLE_DAYS,
  CYCLE_PHASES,
  MACRO_SPLIT,
  PERIOD_DAYS,
  RECIPE_ROWS,
  SHOPPING_ITEMS,
  WORKOUT_EXERCISES,
  type Capability,
  type CapabilityId,
} from "./platform-content";

const TODAY_CYCLE_DAY = 14;

const PHONE_VIEW_BY_CAPABILITY = {
  workouts: PhoneWorkoutView,
  nutrition: PhoneNutritionView,
  chat: PhoneMessagingView,
  cycle: PhoneCycleView,
} satisfies Record<CapabilityId, ComponentType>;

type CloudCardProps = {
  capability: Capability;
  className: string;
  isActive: boolean;
  onSelect: (capabilityId: CapabilityId) => void;
};

function CloudCard(props: CloudCardProps) {
  const Icon = props.capability.icon;

  return (
    <button
      aria-pressed={props.isActive}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-2xl border bg-surface-base py-2.5 pr-4 pl-3 text-left transition-all duration-200 motion-reduce:transition-none",
        {
          "-translate-y-0.5 border-brand-primary shadow-public-platform-cloud-active motion-reduce:translate-y-0":
            props.isActive,
          "shadow-public-platform-cloud hover:-translate-y-0.5 hover:border-brand-primary/40 motion-reduce:hover:translate-y-0":
            !props.isActive,
        },
        props.className,
      )}
      onClick={() => props.onSelect(props.capability.id)}
      type="button"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-control transition-colors",
          {
            "bg-brand-primary text-brand-primary-foreground": props.isActive,
            "bg-brand-primary-soft text-brand-primary": !props.isActive,
          },
        )}
      >
        <Icon aria-hidden="true" size={16} />
      </span>
      <span className="text-xs leading-tight font-semibold whitespace-nowrap text-text-primary sm:text-sm">
        {props.capability.label}
      </span>
    </button>
  );
}

type PhoneViewProps = {
  activeCapability: CapabilityId;
};

function PhoneView(props: PhoneViewProps) {
  const Component = PHONE_VIEW_BY_CAPABILITY[props.activeCapability];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-0 motion-reduce:transform-none"
        exit={{ opacity: 0, y: -8 }}
        initial={{ opacity: 0, y: 8 }}
        key={props.activeCapability}
        transition={{ duration: 0.25, ease: publicEase }}
      >
        <Component />
      </motion.div>
    </AnimatePresence>
  );
}

function PhoneWorkoutView() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 bg-gradient-to-b from-brand-primary/10 via-surface-base to-surface-base px-4 pt-12 pb-5">
      <div>
        <p className="text-phone-caption font-bold tracking-section-eyebrow text-text-muted uppercase">
          Week 3 · Day 2
        </p>
        <h4 className="mt-0.5 text-phone-title font-semibold text-text-primary">
          Lower Strength
        </h4>
      </div>

      {WORKOUT_EXERCISES.map((exercise) => (
        <div
          className="flex items-center gap-2.5 rounded-2xl border bg-surface-base p-2.5 shadow-card"
          key={exercise.number}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-text-primary text-phone-action font-bold text-surface-base tabular-nums">
            {exercise.number}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-tight font-semibold text-text-primary">
              {exercise.name}
            </p>
            <p className="text-phone-caption text-text-muted">
              {exercise.detail}
            </p>
          </div>
        </div>
      ))}

      <div className="mt-auto rounded-2xl border border-brand-primary/20 bg-brand-primary-soft p-3 text-center">
        <p className="text-phone-action font-semibold tracking-widest text-brand-primary uppercase">
          3 more exercises
        </p>
      </div>
    </div>
  );
}

function PhoneNutritionView() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 overflow-hidden bg-gradient-to-b from-brand-primary/10 via-surface-base to-surface-base px-4 pt-12 pb-5">
      <div>
        <p className="text-phone-caption font-bold tracking-section-eyebrow text-text-muted uppercase">
          Today · April 17
        </p>
        <h4 className="mt-0.5 text-phone-title font-semibold text-text-primary">
          Your nutrition
        </h4>
      </div>

      <div className="rounded-2xl border bg-surface-base p-3 shadow-card">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-phone-caption font-bold tracking-section-eyebrow text-text-muted uppercase">
            Daily target
          </p>
          <span className="text-phone-caption text-text-muted tabular-nums">
            BMR 1,420
          </span>
        </div>
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="font-heading text-phone-value font-medium text-text-primary tabular-nums">
            1,700
          </span>
          <span className="text-phone-action text-text-muted">kcal</span>
        </div>
        <div className="flex h-1 overflow-hidden rounded-full">
          {MACRO_SPLIT.map((macro) => (
            <div className={macro.widthClassName} key={macro.label} />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-phone-caption text-text-muted">
          {MACRO_SPLIT.map((macro) => (
            <span key={macro.label}>{macro.label}</span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-surface-base p-3 shadow-card">
        <p className="mb-2 text-phone-caption font-bold tracking-section-eyebrow text-text-muted uppercase">
          Recipes this week
        </p>
        <div className="space-y-1.5">
          {RECIPE_ROWS.map((recipe) => (
            <div className="flex items-center gap-2" key={recipe.name}>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-primary-soft">
                <Utensils className="text-brand-primary" size={11} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-caption leading-tight font-medium text-text-primary">
                  {recipe.name}
                </p>
                <p className="text-phone-caption text-text-muted">
                  {recipe.duration}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-surface-base p-3 shadow-card">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-phone-caption font-bold tracking-section-eyebrow text-text-muted uppercase">
            Shopping list
          </p>
          <span className="text-phone-caption text-text-muted tabular-nums">
            17 items
          </span>
        </div>
        <ul className="space-y-1">
          {SHOPPING_ITEMS.map((item) => (
            <li
              className="flex items-center gap-1.5 text-caption text-text-primary"
              key={item}
            >
              <span className="flex size-3 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
                <Check size={8} strokeWidth={3} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PhoneMessagingView() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 bg-surface-base px-4 pt-12 pb-5">
      <div className="flex items-center gap-2.5 rounded-lg border-b px-3 pb-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-primary/70">
          <span className="font-heading text-sm leading-none text-brand-primary-foreground">
            E
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-tight font-semibold text-text-primary">
            Evoa
          </p>
          <p className="text-phone-caption text-text-muted">
            Replies in ~1 hour
          </p>
        </div>
        <span className="size-2 rounded-full bg-brand-primary" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
        <div className="flex items-end gap-1.5">
          <div className="size-6 shrink-0 rounded-full bg-gradient-to-tr from-brand-primary to-brand-primary/60" />
          <div className="max-w-[80%] rounded-2xl rounded-bl-tile bg-brand-primary-soft px-3 py-2 text-caption leading-snug text-text-primary">
            How did Tuesday's session feel?
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[75%] rounded-2xl rounded-br-tile bg-surface-neutral px-3 py-2 text-caption leading-snug text-text-primary">
            Felt strong — let's keep going.
          </div>
        </div>

        <section className="max-w-[92%] rounded-2xl rounded-bl-tile border-2 border-brand-primary/30 bg-brand-primary/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Calendar className="text-brand-primary" size={10} />
            <span className="text-phone-caption font-bold tracking-section-eyebrow text-brand-primary uppercase">
              Check-in proposed
            </span>
          </div>
          <p className="mb-2 text-caption text-text-primary">
            Fri 9:00 AM · 20 min
          </p>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-brand-primary px-2.5 py-1 text-phone-action font-semibold text-brand-primary-foreground">
              Approve
            </span>
            <span className="rounded-full border bg-surface-base px-2.5 py-1 text-phone-action font-semibold text-text-primary">
              Reschedule
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function PhoneCycleView() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 bg-gradient-to-b from-brand-primary/10 via-surface-base to-surface-base px-4 pt-12 pb-5">
      <div>
        <p className="text-phone-caption font-bold tracking-section-eyebrow text-text-muted uppercase">
          Day {TODAY_CYCLE_DAY} · Cycle
        </p>
        <h4 className="mt-0.5 text-phone-title font-semibold text-text-primary">
          Ovulatory phase
        </h4>
      </div>

      <div className="rounded-2xl border bg-surface-base p-3 shadow-card">
        <div className="grid grid-cols-7 gap-1">
          {CYCLE_DAYS.map((day) => {
            const isToday = day === TODAY_CYCLE_DAY;
            const isPeriod = PERIOD_DAYS.includes(day);

            return (
              <div
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-lg text-phone-caption font-medium",
                  {
                    "bg-cycle-menstrual text-text-inverted": isPeriod,
                    "bg-surface-neutral/40 text-text-muted": !isPeriod,
                    "ring-2 ring-brand-primary ring-offset-1 ring-offset-surface-base":
                      isToday,
                  },
                )}
                key={day}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-surface-base p-3 shadow-card">
        <p className="mb-2 text-phone-caption font-bold tracking-section-eyebrow text-text-muted uppercase">
          This cycle
        </p>
        <div className="space-y-1.5">
          {CYCLE_PHASES.map((phase) => (
            <div
              className={cn("flex items-center gap-2 rounded-lg px-1.5 py-1", {
                "bg-brand-primary-soft": phase.active,
              })}
              key={phase.name}
            >
              <span
                className={cn("size-2 rounded-full", phase.tokenClassName)}
              />
              <span
                className={cn("flex-1 text-phone-action", {
                  "font-semibold text-text-primary": phase.active,
                  "text-text-muted": !phase.active,
                })}
              >
                {phase.name}
              </span>
              <span className="text-phone-caption text-text-muted tabular-nums">
                Day {phase.days}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PublicPlatform() {
  const [activeCapability, setActiveCapability] =
    useState<CapabilityId>("workouts");
  const headingId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  const cycleCapability = (direction: 1 | -1) => {
    setActiveCapability((current) => {
      const currentIndex = CAPABILITIES.findIndex(
        (capability) => capability.id === current,
      );
      const nextIndex =
        (currentIndex + direction + CAPABILITIES.length) % CAPABILITIES.length;
      return CAPABILITIES[nextIndex].id;
    });
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const tabs = tabsRef.current;
    if (!tabs) return;
    const activeButton = tabs.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    );
    if (!activeButton || typeof activeButton.scrollIntoView !== "function")
      return;
    activeButton.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeCapability]);

  useEffect(() => {
    const phone = phoneRef.current;
    if (!phone) return;

    const SWIPE_THRESHOLD = 40;
    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isTracking = true;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isTracking) return;
      isTracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      cycleCapability(dx < 0 ? 1 : -1);
    };

    const onTouchCancel = () => {
      isTracking = false;
    };

    phone.addEventListener("touchstart", onTouchStart, { passive: true });
    phone.addEventListener("touchend", onTouchEnd, { passive: true });
    phone.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      phone.removeEventListener("touchstart", onTouchStart);
      phone.removeEventListener("touchend", onTouchEnd);
      phone.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden bg-surface-base py-20 lg:py-28"
    >
      <div className="mx-auto max-w-stage px-6 md:px-12 lg:px-24">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center motion-reduce:transform-none lg:mb-16"
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.6, ease: publicEase }}
          viewport={publicSectionRevealViewport}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <SectionEyebrow>Your fitness, in one app</SectionEyebrow>
          <h2
            className="font-heading text-3xl leading-tight font-medium text-text-primary md:text-4xl lg:text-5xl"
            id={headingId}
          >
            Open your phone. See your plan.
          </h2>
        </motion.div>

        <div
          aria-label="App capabilities"
          className="-mx-6 mb-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pt-3 pb-3 lg:hidden"
          ref={tabsRef}
          role="group"
        >
          {CAPABILITIES.map((capability) => (
            <CloudCard
              capability={capability}
              className="shrink-0 snap-center"
              isActive={activeCapability === capability.id}
              key={capability.id}
              onSelect={setActiveCapability}
            />
          ))}
        </div>

        <div className="flex items-center justify-center lg:min-h-[600px]">
          <motion.div
            className="relative motion-reduce:transform-none"
            initial={{ opacity: 0, y: 24 }}
            ref={phoneRef}
            transition={{ duration: 0.6, ease: publicEase }}
            viewport={publicSectionRevealViewport}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <PhoneFrame
              aria-hidden="true"
              className="aspect-9/16 w-(--size-public-platform-phone-base) sm:w-(--size-public-platform-phone-sm)"
              statusBarVariant="dark"
            >
              <PhoneView activeCapability={activeCapability} />
            </PhoneFrame>

            <div
              aria-label="App capabilities"
              className="hidden lg:block"
              role="group"
            >
              {CAPABILITIES.map((capability, capabilityIndex) => (
                <motion.div
                  className={cn(
                    "absolute z-20 motion-reduce:transform-none",
                    capability.desktopPositionClassName,
                  )}
                  initial={{ opacity: 0, y: 16 }}
                  key={capability.id}
                  transition={{
                    delay: 0.15 + capabilityIndex * 0.08,
                    duration: 0.5,
                    ease: publicEase,
                  }}
                  viewport={publicSectionRevealViewport}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <CloudCard
                    capability={capability}
                    className="w-max"
                    isActive={activeCapability === capability.id}
                    onSelect={setActiveCapability}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

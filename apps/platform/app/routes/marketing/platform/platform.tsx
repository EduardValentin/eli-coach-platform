import { cn, PhoneFrame, SectionEyebrow, useHasEnteredViewport } from "@eli-coach-platform/ui";
import { Calendar, Check, Utensils } from "lucide-react";
import type { ComponentType } from "react";
import { useId, useState } from "react";

import {
  CAPABILITIES,
  CYCLE_DAYS,
  CYCLE_PHASES,
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
  className?: string;
  isActive: boolean;
  onSelect: (capabilityId: CapabilityId) => void;
};

function CloudCard(props: CloudCardProps) {
  const Icon = props.capability.icon;

  return (
    <button
      aria-pressed={props.isActive}
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5 rounded-md border bg-surface-base py-2.5 pr-4 pl-3 text-left shadow-raised outline-none transition-[border-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary motion-reduce:transition-none",
        {
          "border-brand-primary shadow-brand-glow -translate-y-0.5 motion-reduce:translate-y-0":
            props.isActive,
          "border-border-subtle hover:-translate-y-0.5 hover:border-brand-primary/40 motion-reduce:hover:translate-y-0":
            !props.isActive,
        },
        props.className,
      )}
      onClick={() => props.onSelect(props.capability.id)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
          {
            "bg-brand-primary text-brand-primary-foreground": props.isActive,
            "bg-brand-primary-soft text-brand-primary": !props.isActive,
          },
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="whitespace-nowrap text-body-sm font-semibold leading-tight text-text-primary">
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
    <div key={props.activeCapability} className="ui-public-platform-phone-view absolute inset-0">
      <Component />
    </div>
  );
}

function PhoneWorkoutView() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 bg-gradient-to-b from-brand-primary-soft via-surface-base to-surface-base px-4 pt-12 pb-5">
      <div>
        <p className="text-label font-semibold tracking-section-eyebrow text-text-muted uppercase">
          Week 3 · Day 2
        </p>
        <h3 className="mt-0.5 text-display-sm font-semibold leading-heading text-text-primary">
          Lower Strength
        </h3>
      </div>

      {WORKOUT_EXERCISES.map((exercise) => (
        <article
          className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-base p-2.5 shadow-soft"
          key={exercise.number}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-text-primary text-label font-semibold text-text-inverted tabular-nums">
            {exercise.number}
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-body-sm font-semibold leading-tight text-text-primary">
              {exercise.name}
            </h4>
            <p className="text-label text-text-muted">{exercise.detail}</p>
          </div>
        </article>
      ))}

      <div className="mt-auto rounded-md border border-brand-primary/20 bg-brand-primary-soft p-3 text-center">
        <p className="text-label font-semibold tracking-wide text-brand-primary uppercase">
          3 more exercises
        </p>
      </div>
    </div>
  );
}

function PhoneNutritionView() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 overflow-hidden bg-gradient-to-b from-brand-primary-soft via-surface-base to-surface-base px-4 pt-12 pb-5">
      <div>
        <p className="text-label font-semibold tracking-section-eyebrow text-text-muted uppercase">
          Today · April 17
        </p>
        <h3 className="mt-0.5 text-display-sm font-semibold leading-heading text-text-primary">
          Your nutrition
        </h3>
      </div>

      <section
        aria-label="Daily nutrition target"
        className="rounded-md border border-border-subtle bg-surface-base p-3 shadow-soft"
      >
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <p className="text-label font-semibold tracking-section-eyebrow text-text-muted uppercase">
            Daily target
          </p>
          <span className="text-label text-text-muted tabular-nums">BMR 1,420</span>
        </div>
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="font-heading text-display-md font-medium text-text-primary tabular-nums">
            1,700
          </span>
          <span className="text-label text-text-muted">kcal</span>
        </div>
        <div aria-hidden="true" className="grid h-1 grid-cols-[35fr_40fr_25fr] overflow-hidden rounded-pill">
          <span className="bg-brand-primary" />
          <span className="bg-brand-primary/60" />
          <span className="bg-brand-primary/30" />
        </div>
        <dl className="mt-1.5 grid grid-cols-3 gap-1 text-label text-text-muted">
          <div>
            <dt className="ui-sr-only">Protein</dt>
            <dd>Protein 35%</dd>
          </div>
          <div>
            <dt className="ui-sr-only">Carbs</dt>
            <dd>Carbs 40%</dd>
          </div>
          <div>
            <dt className="ui-sr-only">Fat</dt>
            <dd>Fat 25%</dd>
          </div>
        </dl>
      </section>

      <section
        aria-label="Recipes this week"
        className="rounded-md border border-border-subtle bg-surface-base p-3 shadow-soft"
      >
        <h4 className="mb-2 text-label font-semibold tracking-section-eyebrow text-text-muted uppercase">
          Recipes this week
        </h4>
        <ul className="space-y-1.5">
          {RECIPE_ROWS.map((recipe) => (
            <li className="flex items-center gap-2" key={recipe.name}>
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-primary-soft"
              >
                <Utensils aria-hidden="true" className="size-3 text-brand-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium leading-tight text-text-primary">
                  {recipe.name}
                </span>
                <span className="block text-label text-text-muted">{recipe.duration}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Shopping list"
        className="rounded-md border border-border-subtle bg-surface-base p-3 shadow-soft"
      >
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <h4 className="text-label font-semibold tracking-section-eyebrow text-text-muted uppercase">
            Shopping list
          </h4>
          <span className="text-label text-text-muted tabular-nums">17 items</span>
        </div>
        <ul className="space-y-1">
          {SHOPPING_ITEMS.map((item) => (
            <li className="flex items-center gap-1.5 text-body-sm text-text-primary" key={item}>
              <span
                aria-hidden="true"
                className="flex size-3 shrink-0 items-center justify-center rounded-pill bg-brand-primary-soft text-brand-primary"
              >
                <Check aria-hidden="true" className="size-2" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PhoneMessagingView() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 bg-surface-base px-4 pt-12 pb-5">
      <header className="flex items-center gap-2.5 border-b border-border-subtle pb-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-gradient-to-br from-brand-primary to-brand-primary/70">
          <span className="font-heading text-body-sm leading-none text-brand-primary-foreground">
            E
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-body-sm font-semibold leading-tight text-text-primary">Eli Fitness</h3>
          <p className="text-label text-text-muted">Replies in ~1 hour</p>
        </div>
        <span aria-hidden="true" className="size-2 rounded-pill bg-brand-primary" />
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
        <div className="flex items-end gap-1.5">
          <span
            aria-hidden="true"
            className="size-6 shrink-0 rounded-pill bg-gradient-to-tr from-brand-primary to-brand-primary/60"
          />
          <p className="max-w-[80%] rounded-2xl rounded-bl-sm bg-brand-primary-soft px-3 py-2 text-body-sm leading-snug text-text-primary">
            How did Tuesday's session feel?
          </p>
        </div>

        <div className="flex justify-end">
          <p className="max-w-[75%] rounded-2xl rounded-br-sm bg-surface-subtle px-3 py-2 text-body-sm leading-snug text-text-primary">
            Felt strong — let's keep going.
          </p>
        </div>

        <section className="max-w-[92%] rounded-2xl rounded-bl-sm border-2 border-brand-primary/30 bg-brand-primary-soft p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Calendar aria-hidden="true" className="size-3 text-brand-primary" />
            <h4 className="text-label font-semibold tracking-section-eyebrow text-brand-primary uppercase">
              Check-in proposed
            </h4>
          </div>
          <p className="mb-2 text-body-sm text-text-primary">Fri 9:00 AM · 20 min</p>
          <div className="flex gap-1.5">
            <span className="rounded-pill bg-brand-primary px-2.5 py-1 text-label font-semibold text-brand-primary-foreground">
              Approve
            </span>
            <span className="rounded-pill border border-border-subtle bg-surface-base px-2.5 py-1 text-label font-semibold text-text-primary">
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
    <div className="absolute inset-0 flex flex-col gap-3 bg-gradient-to-b from-brand-primary-soft via-surface-base to-surface-base px-4 pt-12 pb-5">
      <div>
        <p className="text-label font-semibold tracking-section-eyebrow text-text-muted uppercase">
          Day {TODAY_CYCLE_DAY} · Cycle
        </p>
        <h3 className="mt-0.5 text-display-sm font-semibold leading-heading text-text-primary">
          Ovulatory phase
        </h3>
      </div>

      <section
        aria-label="Cycle calendar"
        className="rounded-md border border-border-subtle bg-surface-base p-3 shadow-soft"
      >
        <div className="grid grid-cols-7 gap-1">
          {CYCLE_DAYS.map((day) => {
            const isToday = day === TODAY_CYCLE_DAY;
            const isPeriod = PERIOD_DAYS.includes(day);

            return (
              <div
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-md bg-surface-subtle text-label font-medium text-text-muted",
                  {
                    "bg-cycle-menstrual text-text-inverted": isPeriod,
                    "font-semibold text-text-primary ring-2 ring-brand-primary ring-offset-1 ring-offset-surface-base":
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
      </section>

      <section
        aria-label="Cycle phases"
        className="rounded-md border border-border-subtle bg-surface-base p-3 shadow-soft"
      >
        <h4 className="mb-2 text-label font-semibold tracking-section-eyebrow text-text-muted uppercase">
          This cycle
        </h4>
        <div className="space-y-1.5">
          {CYCLE_PHASES.map((phase) => (
            <div
              className={cn("flex items-center gap-2 rounded-md px-1.5 py-1", {
                "bg-brand-primary-soft": phase.active,
              })}
              key={phase.name}
            >
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-pill", phase.tokenClassName)}
              />
              <span
                className={cn("flex-1 text-label", {
                  "font-semibold text-text-primary": phase.active,
                  "text-text-muted": !phase.active,
                })}
              >
                {phase.name}
              </span>
              <span className="text-label text-text-muted tabular-nums">Day {phase.days}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MarketingPlatform() {
  const [activeCapability, setActiveCapability] = useState<CapabilityId>("workouts");
  const headingId = useId();
  const { hasEnteredViewport, ref } = useHasEnteredViewport<HTMLElement>();

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden bg-surface-page py-20 lg:py-28"
      id="platform"
      ref={ref}
    >
      <div className="mx-auto w-full max-w-stage px-6 md:px-12 lg:px-24">
        <div
          className="ui-public-platform-entry mx-auto mb-12 max-w-2xl text-center lg:mb-16"
          data-entered={hasEnteredViewport}
        >
          <SectionEyebrow>Your fitness, in one app</SectionEyebrow>
          <h2
            className="font-heading text-3xl font-medium leading-heading text-text-primary md:text-4xl lg:text-5xl"
            id={headingId}
          >
            Open your phone, see your plan.
          </h2>
        </div>

        <div
          aria-label="App capabilities"
          className="-mx-6 mb-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pt-3 pb-3 lg:hidden"
        >
          {CAPABILITIES.map((capability) => (
            <CloudCard
              capability={capability}
              className="snap-center"
              isActive={activeCapability === capability.id}
              key={capability.id}
              onSelect={setActiveCapability}
            />
          ))}
        </div>

        <div className="flex items-center justify-center lg:min-h-[37.5rem]">
          <div
            className="ui-public-platform-entry relative"
            data-entered={hasEnteredViewport}
          >
            <PhoneFrame className="aspect-[9/16] w-64 sm:w-72" statusBarVariant="dark">
              <PhoneView activeCapability={activeCapability} />
            </PhoneFrame>

            <div className="hidden lg:block">
              {CAPABILITIES.map((capability) => (
                <div
                  className={cn(
                    "ui-public-platform-entry absolute z-20",
                    capability.desktopDelayClassName,
                    capability.desktopPositionClassName,
                  )}
                  data-entered={hasEnteredViewport}
                  key={capability.id}
                >
                  <CloudCard
                    capability={capability}
                    className="w-max"
                    isActive={activeCapability === capability.id}
                    onSelect={setActiveCapability}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

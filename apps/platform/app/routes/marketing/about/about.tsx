import type { WaitlistSnapshot } from "@eli-coach-platform/contracts";
import { buttonVariants, cn } from "@eli-coach-platform/ui";
import { Check } from "lucide-react";
import { Link } from "react-router";

import { ABOUT_CHIPS, ABOUT_COPY, ABOUT_MEDIA } from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";

type MarketingAboutProps = {
  waitlist: WaitlistSnapshot;
};

export function MarketingAbout(props: MarketingAboutProps) {
  const closingLine = props.waitlist.enabled ? ABOUT_COPY.waitlistClosing : ABOUT_COPY.normalClosing;

  return (
    <section
      className="mx-auto flex w-full max-w-stage flex-col items-center gap-16 bg-surface-page px-6 py-24 text-center lg:flex-row lg:gap-24 lg:text-left"
      id="about"
    >
      <div className="flex flex-1 flex-col items-center lg:items-start">
        <figure className="ui-public-hero-entrance ui-public-hero-entrance-pop group relative mb-8 size-48 rounded-pill p-2 md:size-56">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-pill bg-gradient-to-tr from-brand-primary to-brand-secondary opacity-70 blur-md transition-opacity duration-150 group-hover:opacity-100"
          />
          <div aria-hidden="true" className="absolute inset-[3px] z-10 rounded-pill bg-surface-base" />
          <img
            alt="Eli, personal trainer and nutritionist for women, smiling outdoors"
            className="relative z-20 size-full rounded-pill object-cover"
            src={ABOUT_MEDIA.heroPoster}
          />
        </figure>

        <div className="ui-public-hero-entrance w-full max-w-xl">
          <p className="mb-4 text-label font-semibold uppercase tracking-[0.2em] text-brand-primary">
            {ABOUT_COPY.eyebrow}
          </p>
          <h2 className="mb-6 font-heading text-4xl font-medium leading-heading text-text-primary md:text-5xl">
            {ABOUT_COPY.heading}
          </h2>
          <div className="space-y-4 text-body-lg leading-[1.65] text-text-secondary">
            <p>{ABOUT_COPY.bio}</p>
            <p className="pt-2 font-medium text-text-primary">{closingLine}</p>
          </div>

          <ul
            aria-label="Eli's credentials and coaching focus"
            className="mt-8 flex flex-wrap items-center justify-center gap-4 text-body-sm font-medium text-text-secondary lg:justify-start"
          >
            {ABOUT_CHIPS.map((chip) => (
              <li key={chip} className="flex items-center gap-1.5">
                <Check aria-hidden="true" className="size-4 text-brand-primary" strokeWidth={2.5} />
                <span>{chip}</span>
              </li>
            ))}
          </ul>

          {props.waitlist.enabled ? null : (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
              <Link className={cn(buttonVariants({ size: "lg" }), "px-8")} to="/book">
                Start my plan
              </Link>
              <Link
                className="text-body-sm font-semibold text-text-muted underline underline-offset-4 transition-colors duration-150 hover:text-brand-primary"
                to="/pricing"
              >
                See pricing
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="ui-public-hero-entrance flex w-full flex-1 justify-center lg:justify-end">
        <InstagramStoryWidget />
      </div>
    </section>
  );
}

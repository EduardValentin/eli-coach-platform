import type { Waitlist } from "@eli-coach-platform/contracts";
import { useHasEnteredViewport } from "@eli-coach-platform/ui";
import { Check } from "lucide-react";
import { Link } from "react-router";

import { ABOUT_CHIPS, ABOUT_COPY, ABOUT_MEDIA } from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";
import "./about.animation.css";

type MarketingAboutProps = {
  waitlist: Waitlist;
};

export function MarketingAbout(props: MarketingAboutProps) {
  const { hasEnteredViewport, ref } = useHasEnteredViewport<HTMLElement>();
  const closingLine = props.waitlist.enabled ? ABOUT_COPY.waitlistClosing : ABOUT_COPY.normalClosing;

  return (
    <section
      className="mx-auto flex w-full max-w-7xl flex-col items-center gap-16 px-6 py-24 text-center lg:flex-row lg:gap-24 lg:text-left"
      id="about"
      ref={ref}
    >
      <div className="flex flex-1 flex-col items-center lg:items-start">
        <figure
          className="ui-public-about-entry ui-public-about-entry-portrait group relative mb-8 size-48 rounded-pill p-2 md:size-56"
          data-entered={hasEnteredViewport}
        >
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

        <div
          className="ui-public-about-entry ui-public-about-entry-copy w-full max-w-xl"
          data-entered={hasEnteredViewport}
        >
          <p className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary md:text-sm">
            {ABOUT_COPY.eyebrow}
          </p>
          <h2 className="mb-6 font-heading text-4xl font-medium leading-10 text-text-primary md:text-5xl md:leading-none">
            {ABOUT_COPY.heading}
          </h2>
          <div className="space-y-4 text-body-lg leading-copy-relaxed text-copy-muted">
            <p>{ABOUT_COPY.bio}</p>
            <p className="pt-2 font-medium text-text-primary">{closingLine}</p>
          </div>

          <ul
            aria-label="Eli's credentials and coaching focus"
            className="mt-8 flex flex-wrap items-center justify-center gap-4 text-body-sm font-medium leading-5 text-about-credential-text lg:justify-start"
          >
            {ABOUT_CHIPS.map((chip) => (
              <li key={chip} className="flex items-center gap-1.5">
                <Check aria-hidden="true" className="size-3 text-brand-primary" strokeWidth={2.5} />
                <span>{chip}</span>
              </li>
            ))}
          </ul>

          {props.waitlist.enabled ? null : (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
              <Link
                className="inline-flex h-12 min-w-0 items-center justify-center rounded-pill bg-brand-primary px-8 text-center text-body-base font-medium leading-6 text-text-inverted shadow-md transition-[background-color,color,box-shadow,transform] duration-150 ease-out outline-none hover:bg-brand-primary-hover hover:shadow-lg active:bg-brand-primary-pressed active:scale-[0.98] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
                to="/book"
              >
                Start my plan
              </Link>
              <Link
                className="text-body-sm font-semibold leading-5 text-link-muted underline underline-offset-4 outline-none transition-colors duration-150 hover:text-brand-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
                to="/pricing"
              >
                See pricing
              </Link>
            </div>
          )}
        </div>
      </div>

      <div
        className="ui-public-about-entry ui-public-about-entry-widget flex w-full flex-1 justify-center lg:justify-end"
        data-entered={hasEnteredViewport}
      >
        <InstagramStoryWidget />
      </div>
    </section>
  );
}

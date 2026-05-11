import { Badge, buttonVariants, Link as UiLink } from "@eli-coach-platform/ui";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";

import {
  ABOUT_BIO_COPY,
  ABOUT_CREDENTIAL_CHIPS,
  ABOUT_NORMAL_CLOSING_LINE,
  ABOUT_PORTRAIT,
  ABOUT_WAITLIST_CLOSING_LINE,
} from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";
import { SectionEyebrow } from "./section-eyebrow";

type MarketingAboutProps = {
  waitlistMode: boolean;
};

export function MarketingAbout(props: MarketingAboutProps) {
  const closingLine = props.waitlistMode
    ? ABOUT_WAITLIST_CLOSING_LINE
    : ABOUT_NORMAL_CLOSING_LINE;

  return (
    <section className="bg-surface-page px-6 py-24 text-text-primary">
      <div className="mx-auto grid max-w-stage items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.76fr)] lg:gap-24">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="relative mb-8 size-48 rounded-pill p-2 md:size-56">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-pill bg-gradient-to-tr from-brand-primary to-brand-secondary opacity-80 blur-md"
            />
            <div
              aria-hidden="true"
              className="absolute inset-1 rounded-pill bg-surface-page"
            />
            <img
              alt={ABOUT_PORTRAIT.alt}
              className="relative size-full rounded-pill object-cover shadow-soft"
              decoding="async"
              loading="lazy"
              src={ABOUT_PORTRAIT.src}
            />
          </div>

          <SectionEyebrow>Strength & nutrition for women</SectionEyebrow>
          <h2 className="mb-6 max-w-reading font-heading text-display-lg text-text-primary">
            Meet Eli, your coach
          </h2>
          <div className="max-w-reading space-y-4 text-body-lg leading-body text-text-secondary">
            <p>{ABOUT_BIO_COPY}</p>
            <p className="font-medium text-text-primary">{closingLine}</p>
          </div>

          <ul
            aria-label="Eli's credentials"
            className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
          >
            {ABOUT_CREDENTIAL_CHIPS.map((chip) => (
              <li key={chip}>
                <Badge className="gap-1.5 normal-case tracking-normal" variant="default">
                  <Check aria-hidden="true" className="size-4 text-brand-primary" />
                  {chip}
                </Badge>
              </li>
            ))}
          </ul>

          {props.waitlistMode ? null : (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
              <Link className={buttonVariants({ size: "lg" })} to="/book">
                Start my plan
                <ArrowRight aria-hidden="true" size={20} />
              </Link>
              <UiLink to="/pricing" variant="inline">
                See pricing
              </UiLink>
            </div>
          )}
        </div>

        <div className="flex w-full justify-center lg:justify-end">
          <InstagramStoryWidget />
        </div>
      </div>
    </section>
  );
}

import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import {
  SectionEyebrow,
  buttonVariants,
} from "@eli-coach-platform/ui/primitives";
import { motion } from "motion/react";
import { Link } from "react-router";

import { PRICING_PATH } from "~/surfaces/public-site/paths";
import { BOOK_PATH } from "~/features/assessment-calls/contracts/paths";

import { ABOUT_CHIPS, ABOUT_COPY, ABOUT_MEDIA } from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";

type PublicAboutProps = {
  waitlist: WaitlistPresentation;
};

const ABOUT_VIEWPORT = { once: true } as const;

export function PublicAbout(props: PublicAboutProps) {
  const closingLine =
    props.waitlist.mode === "disabled"
      ? ABOUT_COPY.normalClosing
      : ABOUT_COPY.waitlistClosing;

  return (
    <section
      className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 py-24 lg:flex-row lg:gap-24"
      id="about"
    >
      <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
        <motion.figure
          className="group relative mb-8 size-48 rounded-full p-2 md:size-56"
          initial={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6 }}
          viewport={ABOUT_VIEWPORT}
          whileInView={{ opacity: 1, scale: 1 }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary opacity-70 blur-md transition-opacity group-hover:opacity-100"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[3px] z-10 rounded-full bg-surface-base"
          />
          <img
            alt="Eli, personal trainer and nutritionist for women, smiling outdoors"
            className="relative z-20 size-full rounded-full object-cover"
            height={208}
            src={ABOUT_MEDIA.eliPortraitLarge}
            width={208}
          />
        </motion.figure>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={ABOUT_VIEWPORT}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <SectionEyebrow>{ABOUT_COPY.eyebrow}</SectionEyebrow>
          <h2 className="mb-6 font-heading text-4xl font-medium text-text-primary md:text-5xl">
            {ABOUT_COPY.heading}
          </h2>
          <div className="max-w-xl space-y-4 text-lg leading-relaxed text-copy-muted">
            {ABOUT_COPY.bioParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className="pt-2 font-medium text-text-primary">{closingLine}</p>
          </div>

          <ul
            aria-label="Eli's credentials and coaching focus"
            className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-text-label lg:justify-start"
          >
            {ABOUT_CHIPS.map((chip) => (
              <li key={chip} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="text-brand-primary">
                  ✔
                </span>{" "}
                {chip}
              </li>
            ))}
          </ul>

          {props.waitlist.showsAuthControls ? (
            <div className="mt-10 flex items-center justify-center gap-6 lg:justify-start">
              <span className="inline-block">
                <Link
                  className={buttonVariants({
                    elevation: "lifted",
                    press: "scale",
                    size: "cta",
                  })}
                  to={BOOK_PATH}
                >
                  Book a free call
                </Link>
              </span>
              <Link
                className="text-sm font-semibold text-link-muted underline underline-offset-4 transition-colors hover:text-brand-primary"
                to={PRICING_PATH}
              >
                See pricing
              </Link>
            </div>
          ) : null}
        </motion.div>
      </div>

      <motion.div
        className="flex w-full flex-1 justify-center lg:justify-end"
        initial={{ opacity: 0, x: 20 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        viewport={ABOUT_VIEWPORT}
        whileInView={{ opacity: 1, x: 0 }}
      >
        <InstagramStoryWidget />
      </motion.div>
    </section>
  );
}

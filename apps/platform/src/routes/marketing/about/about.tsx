import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import { motion } from "motion/react";
import { Link } from "react-router";

import { ABOUT_CHIPS, ABOUT_COPY, ABOUT_MEDIA } from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";
import { createFadeUpVariants, marketingEase, marketingViewportOnce } from "../marketing-motion";

type MarketingAboutProps = {
  waitlist: Waitlist;
};

export function MarketingAbout(props: MarketingAboutProps) {
  const closingLine = props.waitlist.enabled ? ABOUT_COPY.waitlistClosing : ABOUT_COPY.normalClosing;

  return (
    <motion.section
      className="mx-auto flex w-full max-w-7xl flex-col items-center gap-16 px-6 py-24 text-center lg:flex-row lg:gap-24 lg:text-left"
      initial="hidden"
      viewport={marketingViewportOnce}
      whileInView="visible"
    >
      <div className="flex flex-1 flex-col items-center lg:items-start">
        <motion.figure
          className="group relative mb-8 size-48 rounded-pill p-2 md:size-56"
          variants={{
            hidden: { opacity: 0, scale: 0.9 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: { duration: 0.6, ease: marketingEase },
            },
          }}
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
        </motion.figure>

        <motion.div
          className="w-full max-w-xl"
          variants={createFadeUpVariants({ delay: 0.2, duration: 0.6, offset: 20 })}
        >
          <p className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary md:text-sm">
            {ABOUT_COPY.eyebrow}
          </p>
          <h2 className="mb-6 font-heading text-4xl font-medium leading-10 text-text-primary md:text-5xl md:leading-none">
            {ABOUT_COPY.heading}
          </h2>
          <div className="space-y-4 text-body-lg leading-copy-relaxed text-copy-muted">
            {ABOUT_COPY.bioParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className="pt-2 font-medium text-text-primary">{closingLine}</p>
          </div>

          <ul
            aria-label="Eli's credentials and coaching focus"
            className="mt-8 flex flex-wrap items-center justify-center gap-4 text-body-sm font-medium leading-5 text-about-credential-text lg:justify-start"
          >
            {ABOUT_CHIPS.map((chip) => (
              <li key={chip} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="text-brand-primary">
                  ✔
                </span>
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
        </motion.div>
      </div>

      <motion.div
        className="flex w-full flex-1 justify-center lg:justify-end"
        variants={{
          hidden: { opacity: 0, x: 20 },
          visible: {
            opacity: 1,
            transition: { delay: 0.4, duration: 0.8, ease: marketingEase },
            x: 0,
          },
        }}
      >
        <InstagramStoryWidget />
      </motion.div>
    </motion.section>
  );
}

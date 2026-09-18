import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  publicEaseOut,
  useClientReducedMotionPreference,
} from "@eli-coach-platform/ui/motion";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useRef, type PropsWithChildren } from "react";
import { Link as RouterLink } from "react-router";

import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";

import { STORE_PATH } from "~/features/store/contracts/paths";
import { LegalNav } from "~/surfaces/public-site/sections/legal/legal-nav";
import { WaitlistAvailabilityStatus } from "~/features/waitlist/ui/public/availability-status";
import { WaitlistEmailForm } from "~/features/waitlist/ui/public/email-form";
import { PRICING_PATH } from "~/surfaces/public-site/paths";

type PublicFooterCtaProps = {
  botDetection: BotDetectionConfig;
  waitlist: WaitlistPresentation;
};

const FOOTER_CTA_SHEET_OFFSET_PX = 140;
const FOOTER_CTA_INITIAL_SCALE = 0.97;
const footerCtaLinkClassName =
  "inline-flex h-12 w-full items-center justify-center rounded-xl px-8 text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] sm:w-auto";

export function PublicFooterCta(props: PublicFooterCtaProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const isTextInView = useInView(textRef, { amount: 0.2, once: true });
  const shouldReduceMotion = useClientReducedMotionPreference();
  const { scrollYProgress } = useScroll({
    offset: ["start end", "end end"],
    target: sectionRef,
  });
  const sheetY = useTransform(scrollYProgress, (value) => {
    const progress = Math.min(value / 0.7, 1);

    return FOOTER_CTA_SHEET_OFFSET_PX * (1 - progress);
  });
  const sheetScale = useTransform(scrollYProgress, (value) => {
    const progress = Math.min(value / 0.7, 1);

    return FOOTER_CTA_INITIAL_SCALE + (1 - FOOTER_CTA_INITIAL_SCALE) * progress;
  });
  const isRevealed = shouldReduceMotion || isTextInView;

  return (
    <section
      aria-label="Start your next step"
      className="relative z-10 -mt-10"
      ref={sectionRef}
    >
      <motion.div
        className="rounded-t-phone-frame bg-surface-brand-soft px-6 pb-10 pt-28 text-center text-text-primary shadow-public-footer-cta-sheet"
        style={
          shouldReduceMotion ? undefined : { scale: sheetScale, y: sheetY }
        }
      >
        <motion.div
          animate={isRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          className="mx-auto max-w-3xl"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
          ref={textRef}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { delay: 0.1, duration: 0.7, ease: publicEaseOut }
          }
        >
          {props.waitlist.mode === "disabled" ? (
            <FooterNormalContent
              isRevealed={isRevealed}
              shouldReduceMotion={shouldReduceMotion}
            />
          ) : (
            <FooterWaitlistContent
              botDetection={props.botDetection}
              isRevealed={isRevealed}
              shouldReduceMotion={shouldReduceMotion}
              waitlist={props.waitlist}
            />
          )}
        </motion.div>
        <LegalNav className="mx-auto mt-24 max-w-3xl border-t border-brand-primary-soft pt-8" />
      </motion.div>
    </section>
  );
}

type FooterActionsRevealProps = {
  isRevealed: boolean;
  shouldReduceMotion: boolean;
};

function FooterActionsReveal(
  props: PropsWithChildren<FooterActionsRevealProps & { className: string }>,
) {
  return (
    <motion.div
      animate={props.isRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      className={props.className}
      initial={props.shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      transition={
        props.shouldReduceMotion
          ? { duration: 0 }
          : { delay: 0.35, duration: 0.5, ease: publicEaseOut }
      }
    >
      {props.children}
    </motion.div>
  );
}

function FooterWaitlistContent(
  props: FooterActionsRevealProps & {
    botDetection: BotDetectionConfig;
    waitlist: WaitlistPresentation;
  },
) {
  const { isClosed, isUnavailable, mode } = props.waitlist;

  return (
    <>
      <h2 className={footerCtaHeadingClassName}>
        {isClosed
          ? "This round filled up fast."
          : isUnavailable
            ? "Join the waitlist"
            : "Don't miss your spot"}
      </h2>
      <p className={footerCtaParagraphClassName}>
        {isClosed
          ? "Leave your email and you'll be first to know when the next spots open."
          : isUnavailable
            ? "Leave your email and you'll be first to know when coaching opens."
            : "Join the waiting list and you'll be first to know when coaching opens — plus reduced pricing on every plan, reserved for early signups."}
      </p>
      <FooterActionsReveal
        className="space-y-6"
        isRevealed={props.isRevealed}
        shouldReduceMotion={props.shouldReduceMotion}
      >
        <WaitlistEmailForm
          botDetection={props.botDetection}
          mode={mode}
          variant="light"
        />
        <WaitlistAvailabilityStatus
          announcement="none"
          status={props.waitlist.availabilityStatus}
          variant="light"
        />
      </FooterActionsReveal>
    </>
  );
}

function FooterNormalContent(props: FooterActionsRevealProps) {
  return (
    <>
      <h2 className={footerCtaHeadingClassName}>
        Not ready for 1-on-1 coaching?
      </h2>
      <p className={footerCtaParagraphClassName}>
        That's okay. Start feeling better today — free workout challenges,
        recipes, and e-books, no card needed.
      </p>
      <FooterActionsReveal
        className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        isRevealed={props.isRevealed}
        shouldReduceMotion={props.shouldReduceMotion}
      >
        <RouterLink
          className={cn(
            footerCtaLinkClassName,
            "bg-brand-primary text-text-inverted shadow-md hover:bg-brand-primary-hover hover:shadow-lg",
          )}
          to={STORE_PATH}
        >
          Browse the free resources
        </RouterLink>
        <RouterLink
          className={cn(
            footerCtaLinkClassName,
            "border border-brand-primary text-brand-primary hover:bg-brand-primary/5",
          )}
          to={PRICING_PATH}
        >
          See coaching plans
        </RouterLink>
      </FooterActionsReveal>
    </>
  );
}

const footerCtaHeadingClassName =
  "mb-6 font-heading text-public-footer-cta-heading-sm font-medium text-brand-primary md:text-public-footer-cta-heading-md";
const footerCtaParagraphClassName =
  "mx-auto mb-10 max-w-xl text-lg text-copy-muted";

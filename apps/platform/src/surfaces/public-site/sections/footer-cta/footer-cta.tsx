import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  publicEaseOut,
  useClientReducedMotionPreference,
} from "@eli-coach-platform/ui/motion";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import {
  MotionConfig,
  motion,
  useInView,
  useScroll,
  useTransform,
  type Variants,
} from "motion/react";
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

const FOOTER_CTA_TEXT_REVEAL: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    transition: { delay: 0.1, duration: 0.7, ease: publicEaseOut },
    y: 0,
  },
};

const FOOTER_CTA_ACTIONS_REVEAL: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    transition: { delay: 0.35, duration: 0.5, ease: publicEaseOut },
    y: 0,
  },
};

const footerCtaLinkClassName = "w-full sm:w-auto";

export function PublicFooterCta(props: PublicFooterCtaProps) {
  const sectionRef = useRef<HTMLElement>(null);
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

  return (
    <section
      aria-label="Start your next step"
      className="relative z-10 -mt-10"
      ref={sectionRef}
    >
      <MotionConfig reducedMotion="user">
        <motion.div
          className="rounded-t-phone-frame bg-surface-brand-soft px-6 pb-10 pt-28 text-center text-text-primary shadow-public-footer-cta-sheet"
          style={
            shouldReduceMotion ? undefined : { scale: sheetScale, y: sheetY }
          }
        >
          <FooterCtaContent
            botDetection={props.botDetection}
            waitlist={props.waitlist}
          />
          <LegalNav className="mx-auto mt-24 max-w-3xl border-t border-brand-primary-soft pt-8" />
        </motion.div>
      </MotionConfig>
    </section>
  );
}

function FooterCtaContent(props: PublicFooterCtaProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const isTextInView = useInView(textRef, { amount: 0.2, once: true });

  return (
    <motion.div
      animate={isTextInView ? "visible" : "hidden"}
      className="mx-auto max-w-3xl"
      initial="hidden"
      ref={textRef}
      variants={FOOTER_CTA_TEXT_REVEAL}
    >
      {props.waitlist.mode === "disabled" ? (
        <FooterNormalContent />
      ) : (
        <FooterWaitlistContent
          botDetection={props.botDetection}
          waitlist={props.waitlist}
        />
      )}
    </motion.div>
  );
}

function FooterActionsReveal(props: PropsWithChildren<{ className: string }>) {
  return (
    <motion.div
      className={props.className}
      variants={FOOTER_CTA_ACTIONS_REVEAL}
    >
      {props.children}
    </motion.div>
  );
}

function FooterWaitlistContent(props: PublicFooterCtaProps) {
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
      <FooterActionsReveal className="space-y-6">
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

function FooterNormalContent() {
  return (
    <>
      <h2 className={footerCtaHeadingClassName}>
        Not ready for 1-on-1 coaching?
      </h2>
      <p className={footerCtaParagraphClassName}>
        That's okay. Start feeling better today — free workout challenges,
        recipes, and e-books, no card needed.
      </p>
      <FooterActionsReveal className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <RouterLink
          className={cn(
            buttonVariants({
              elevation: "lifted",
              label: "regular",
              press: "scale",
              size: "cta",
            }),
            footerCtaLinkClassName,
          )}
          to={STORE_PATH}
        >
          Browse the free resources
        </RouterLink>
        <RouterLink
          className={cn(
            buttonVariants({
              label: "regular",
              press: "scale",
              size: "cta",
              variant: "outline-brand",
            }),
            footerCtaLinkClassName,
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

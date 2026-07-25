import type { Waitlist } from "@eli-coach-platform/contracts";
import { cn } from "@eli-coach-platform/ui";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type PropsWithChildren } from "react";
import { Link as RouterLink } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";

import { marketingEaseOut, useClientReducedMotionPreference } from "../marketing-motion";
import { WaitlistAvailabilityStatus } from "../waitlist/waitlist-availability-status";
import { WaitlistEmailForm } from "../waitlist/waitlist-email-form";

type MarketingFooterCtaProps = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
};

const FOOTER_CTA_SHEET_OFFSET_PX = 140;
const FOOTER_CTA_INITIAL_SCALE = 0.97;
const footerCtaLinkClassName =
  "inline-flex min-h-[var(--size-control-md)] min-w-0 items-center justify-center rounded-public-footer-cta-control border px-8 text-center text-body-base font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary";

export function MarketingFooterCta(props: MarketingFooterCtaProps) {
  return (
    <FooterCtaShell>
      {props.waitlist.enabled ? (
        <FooterWaitlistContent
          botDetectionConfig={props.botDetectionConfig}
          waitlist={props.waitlist}
        />
      ) : (
        <FooterNormalContent />
      )}
    </FooterCtaShell>
  );
}

export function FooterCtaShell(props: PropsWithChildren) {
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
      <motion.div
        className="rounded-t-phone-frame bg-surface-brand-soft px-6 py-28 text-center text-text-primary shadow-public-footer-cta-sheet"
        style={shouldReduceMotion ? undefined : { scale: sheetScale, y: sheetY }}
      >
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.15,
            opacity: { duration: 0.5, ease: "easeOut" },
            y: { duration: 0.7, ease: marketingEaseOut },
          }}
          viewport={{ amount: 0.2, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          {props.children}
        </motion.div>
      </motion.div>
    </section>
  );
}

function FooterWaitlistContent(props: {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
}) {
  const isClosed = props.waitlist.availability === "closed";
  const isUnavailable = props.waitlist.availability === null;

  return (
    <>
      <h2 className="mb-6 font-heading text-public-footer-cta-heading-sm font-medium text-brand-primary md:text-public-footer-cta-heading-md">
        {isClosed
          ? "This round filled up fast."
          : isUnavailable
            ? "Join the waitlist"
            : "Don't miss your spot"}
      </h2>
      <p className="mx-auto mb-10 max-w-xl text-body-lg text-text-secondary">
        {isClosed
          ? "Leave your email and you'll be first to know when the next spots open."
          : isUnavailable
            ? "Leave your email and you'll be first to know when coaching opens."
          : "Join the waiting list and you'll be first to know when coaching opens — plus reduced pricing on every plan, reserved for early signups."}
      </p>
      <div className="w-full space-y-6">
        <WaitlistEmailForm
          availability={props.waitlist.availability}
          botDetectionConfig={props.botDetectionConfig}
          variant="light"
        />
        <WaitlistAvailabilityStatus
          availability={props.waitlist.availability}
          variant="light"
        />
      </div>
    </>
  );
}

function FooterNormalContent() {
  return (
    <>
      <h2 className="mb-6 font-heading text-public-footer-cta-heading-sm font-medium text-brand-primary md:text-public-footer-cta-heading-md">
        Not ready for 1-on-1 coaching?
      </h2>
      <p className="mx-auto mb-10 max-w-xl text-body-lg text-text-secondary">
        That's okay. Start feeling better today — free workout challenges, recipes, and e-books,
        no card needed.
      </p>
      <div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
        <RouterLink
          className={cn(
            footerCtaLinkClassName,
            "w-full border-transparent bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover active:bg-brand-primary-pressed sm:w-auto",
          )}
          to="/store"
        >
          Get the free starter pack
        </RouterLink>
        <RouterLink
          className={cn(
            footerCtaLinkClassName,
            "w-full border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary-soft active:border-brand-primary-hover active:text-brand-primary-hover sm:w-auto",
          )}
          to="/pricing"
        >
          See coaching plans
        </RouterLink>
      </div>
    </>
  );
}

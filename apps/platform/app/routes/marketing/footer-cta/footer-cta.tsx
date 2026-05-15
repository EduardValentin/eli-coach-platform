import type { Waitlist } from "@eli-coach-platform/contracts";
import { buttonVariants, cn, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import type { CSSProperties, PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";

import { SpotCounter } from "../waitlist/spot-counter";
import { WaitlistEmailForm } from "../waitlist/waitlist-email-form";
import "./footer-cta.animation.css";

type MarketingFooterCtaProps = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
  waitlistApiUrl: string;
};

type FooterCtaStyle = CSSProperties & {
  "--footer-cta-sheet-scale": string;
  "--footer-cta-sheet-y": string;
};

const FOOTER_CTA_SHEET_OFFSET_PX = 140;
const FOOTER_CTA_INITIAL_SCALE = 0.97;
const FOOTER_CTA_SETTLED_PROGRESS = 0.7;

export function MarketingFooterCta(props: MarketingFooterCtaProps) {
  const isFull = props.waitlist.spotsRemaining === 0;

  return (
    <FooterCtaShell>
      {props.waitlist.enabled ? (
        <FooterWaitlistContent
          botDetectionConfig={props.botDetectionConfig}
          isFull={isFull}
          waitlist={props.waitlist}
          waitlistApiUrl={props.waitlistApiUrl}
        />
      ) : (
        <FooterNormalContent />
      )}
    </FooterCtaShell>
  );
}

export function FooterCtaShell(props: PropsWithChildren) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const settled = progress >= FOOTER_CTA_SETTLED_PROGRESS;
  const sheetStyle: FooterCtaStyle = {
    "--footer-cta-sheet-scale": resolveFooterCtaSheetScale(progress),
    "--footer-cta-sheet-y": `${resolveFooterCtaSheetOffset(progress)}px`,
  };

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || typeof window === "undefined") {
      return;
    }

    let frameId: number | null = null;

    const updateProgress = () => {
      frameId = null;
      setProgress(prefersReducedMotion ? 1 : calculateFooterRevealProgress(section));
    };

    const requestProgressUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateProgress);
    };

    requestProgressUpdate();
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", requestProgressUpdate);
      window.removeEventListener("resize", requestProgressUpdate);
    };
  }, [prefersReducedMotion]);

  return (
    <section ref={sectionRef} className="relative z-10 -mt-10" aria-label="Start your next step">
      <div
        className="ui-public-footer-cta-sheet rounded-t-phone-frame bg-surface-brand-soft px-6 py-20 text-center text-text-primary shadow-brand-glow md:py-28"
        style={sheetStyle}
      >
        <div
          className={cn(
            "ui-public-footer-cta-content mx-auto flex max-w-3xl flex-col items-center",
            { "ui-public-footer-cta-content-settled": settled },
          )}
        >
          {props.children}
        </div>
      </div>
    </section>
  );
}

function FooterWaitlistContent(props: {
  botDetectionConfig: BotDetectionConfig;
  isFull: boolean;
  waitlist: Waitlist;
  waitlistApiUrl: string;
}) {
  return (
    <>
      <h2 className="mb-6 font-heading text-display-md font-medium text-brand-primary">
        {props.isFull ? "This round filled up fast." : "Don't miss your spot"}
      </h2>
      <p className="mx-auto mb-10 max-w-xl text-body-lg text-text-secondary">
        {props.isFull
          ? "Leave your email and you'll be first to know when the next spots open."
          : "Join the waiting list and you'll be first to know when the 12-month program opens - plus a launch discount reserved only for early signups."}
      </p>
      <div className="w-full space-y-6">
        <WaitlistEmailForm
          botDetectionConfig={props.botDetectionConfig}
          spotsRemaining={props.waitlist.spotsRemaining}
          variant="light"
          waitlistApiUrl={props.waitlistApiUrl}
        />
        {props.isFull ? null : (
          <SpotCounter
            cap={props.waitlist.cap}
            spotsRemaining={props.waitlist.spotsRemaining}
            variant="light"
          />
        )}
      </div>
    </>
  );
}

function FooterNormalContent() {
  return (
    <>
      <h2 className="mb-6 font-heading text-display-md font-medium text-brand-primary">
        Not ready for 1-on-1 coaching?
      </h2>
      <p className="mx-auto mb-10 max-w-xl text-body-lg text-text-secondary">
        That's okay. Start feeling better today - free workout challenges, recipes, and e-books,
        no card needed.
      </p>
      <div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
        <RouterLink
          className={cn(buttonVariants({ size: "lg", variant: "primary" }), "w-full px-8 sm:w-auto")}
          to="/store"
        >
          Get the free starter pack
        </RouterLink>
        <RouterLink
          className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "w-full px-8 sm:w-auto")}
          to="/pricing"
        >
          See coaching plans
        </RouterLink>
      </div>
    </>
  );
}

function calculateFooterRevealProgress(section: HTMLElement): number {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const rect = section.getBoundingClientRect();
  const revealDistance = Math.max(rect.height * FOOTER_CTA_SETTLED_PROGRESS, 1);
  const visibleFromViewportBottom = viewportHeight - rect.top;

  return clamp(visibleFromViewportBottom / revealDistance, 0, 1);
}

function resolveFooterCtaSheetOffset(progress: number): number {
  return FOOTER_CTA_SHEET_OFFSET_PX * (1 - progress);
}

function resolveFooterCtaSheetScale(progress: number): string {
  const scale = FOOTER_CTA_INITIAL_SCALE + (1 - FOOTER_CTA_INITIAL_SCALE) * progress;

  return scale.toFixed(3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

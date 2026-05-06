import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useOutletContext, type MetaFunction } from "react-router";

import type { MarketingOutletContext } from "./layout/layout";
import { BundleSelector } from "./pricing/bundle-selector";
import { WaitlistEmailForm } from "./waitlist/waitlist-email-form";

export const meta: MetaFunction = () => [
  { title: "Pricing | Eli Coach Platform" },
  {
    name: "description",
    content:
      "1-on-1 coaching bundle pricing for women who want personalized training, nutrition support, and accountability.",
  },
];

export default function PricingRoute() {
  const { botDetectionConfig, waitlist } = useOutletContext<MarketingOutletContext>();
  const [waitlistResponse, setWaitlistResponse] = useState<WaitlistJoinResponse | null>(null);
  const spotsRemaining = resolvePricingSpotsRemaining({
    response: waitlistResponse,
    spotsRemaining: waitlist.spotsRemaining,
  });

  return (
    <section className="mx-auto flex w-full max-w-stage flex-col gap-12 pb-16">
      <header className="mx-auto max-w-reading text-center">
        <h1 className="mb-6 font-heading text-display-lg text-text-primary">
          Coaching Plans
        </h1>
        <p className="mx-auto max-w-3xl text-body-lg leading-body text-text-secondary">
          {waitlist.enabled
            ? "Join the waitlist and lock in reduced pricing on the 12-month plan."
            : "Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support."}
        </p>
      </header>

      <BundleSelector waitlistMode={waitlist.enabled} />

      <section
        aria-labelledby="pricing-closing-cta-heading"
        className="mx-auto w-full max-w-4xl rounded-panel border border-border-subtle bg-surface-base p-8 text-center shadow-soft md:p-12"
      >
        {waitlist.enabled ? (
          <WaitlistPricingCta
            botDetectionConfig={botDetectionConfig}
            onResponseChange={setWaitlistResponse}
            spotsRemaining={spotsRemaining}
          />
        ) : (
          <AssessmentCallCta />
        )}
      </section>
    </section>
  );
}

function WaitlistPricingCta(props: {
  botDetectionConfig: MarketingOutletContext["botDetectionConfig"];
  onResponseChange: (response: WaitlistJoinResponse | null) => void;
  spotsRemaining: number | null;
}) {
  return (
    <>
      <h2
        className="mb-4 font-heading text-display-sm text-text-primary"
        id="pricing-closing-cta-heading"
      >
        Interested in the waitlist price?
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-body-base text-text-secondary">
        Leave your email and you'll be the first to know when spots open.
      </p>
      <WaitlistEmailForm
        botDetectionConfig={props.botDetectionConfig}
        onResponseChange={props.onResponseChange}
        spotsRemaining={props.spotsRemaining}
        variant="light"
      />
    </>
  );
}

function AssessmentCallCta() {
  return (
    <>
      <h2
        className="mb-4 font-heading text-display-sm text-text-primary"
        id="pricing-closing-cta-heading"
      >
        Ready to start?
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-body-base text-text-secondary">
        To ensure we're the perfect fit, all 1-on-1 coaching begins with a complimentary
        assessment call. During this call, we'll discuss your goals and lay out a roadmap
        for your success.
      </p>
      <Link
        className="inline-flex min-h-[var(--size-control-lg)] items-center justify-center gap-2 rounded-pill bg-brand-primary px-8 text-body-base font-semibold text-text-inverted shadow-brand-glow transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-brand-primary-hover active:scale-[0.98]"
        to="/book"
      >
        Book Assessment Call
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </>
  );
}

function resolvePricingSpotsRemaining(options: {
  response: WaitlistJoinResponse | null;
  spotsRemaining: number | null;
}): number | null {
  if (!options.response) {
    return options.spotsRemaining;
  }

  if (options.response.success) {
    return options.response.spotsRemaining;
  }

  return options.spotsRemaining;
}

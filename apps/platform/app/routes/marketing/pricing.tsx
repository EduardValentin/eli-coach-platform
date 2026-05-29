import { ArrowRight } from "lucide-react";
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

  return (
    <section className="mx-auto w-full max-w-stage pb-16 pt-4">
      <header className="mx-auto mb-16 max-w-3xl text-center">
        <h1 className="mb-6 font-heading text-4xl font-medium tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Coaching Plans
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-lg leading-7 text-copy-muted">
          {waitlist.enabled
            ? `Join the waitlist and lock in reduced pricing on the ${formatWaitlistOfferPlan(waitlist.offer.plan)}.`
            : "Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support."}
        </p>
      </header>

      <BundleSelector waitlistMode={waitlist.enabled} waitlistOfferPlan={waitlist.offer.plan} />

      <section
        className="mx-auto w-full max-w-4xl rounded-md border border-stroke-faint bg-surface-base p-8 text-center shadow-sm md:p-12"
      >
        {waitlist.enabled ? (
          <WaitlistPricingCta
            botDetectionConfig={botDetectionConfig}
            spotsRemaining={waitlist.spotsRemaining}
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
  spotsRemaining: number | null;
}) {
  return (
    <>
      <h2 className="mb-4 font-heading text-2xl font-medium leading-8 text-text-primary">
        Interested in the waitlist price?
      </h2>
      <p className="mb-8 text-base leading-6 text-copy-muted">
        Leave your email and you'll be the first to know when spots open.
      </p>
      <WaitlistEmailForm
        botDetectionConfig={props.botDetectionConfig}
        spotsRemaining={props.spotsRemaining}
        variant="light"
      />
    </>
  );
}

function AssessmentCallCta() {
  return (
    <>
      <h2 className="mb-4 font-heading text-2xl font-medium leading-8 text-text-primary">
        Ready to start?
      </h2>
      <p className="mb-8 text-base leading-6 text-copy-muted">
        To ensure we're the perfect fit, all 1-on-1 coaching begins with a complimentary
        assessment call. During this call, we'll discuss your goals and lay out a roadmap
        for your success.
      </p>
      <Link
        className="ui-public-assessment-button inline-flex items-center justify-center gap-2 bg-brand-primary px-8 py-4 text-base font-medium leading-6 text-text-inverted shadow-md transition-colors hover:bg-brand-primary-hover"
        to="/book"
      >
        Book Assessment Call
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </>
  );
}

function formatWaitlistOfferPlan(plan: MarketingOutletContext["waitlist"]["offer"]["plan"]): string {
  const planLabels = {
    "3-months": "3-month plan",
    "6-months": "6-month plan",
    "12-months": "12-month plan",
  } satisfies Record<MarketingOutletContext["waitlist"]["offer"]["plan"], string>;

  return planLabels[plan];
}

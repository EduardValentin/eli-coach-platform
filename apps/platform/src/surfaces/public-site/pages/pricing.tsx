import { ArrowRight } from "lucide-react";
import { Link, useOutletContext, type MetaFunction } from "react-router";

import type { PublicOutletContext } from "~/surfaces/public-site/shell/layout";
import { BundleSelector } from "~/surfaces/public-site/sections/pricing/bundle-selector";
import { presentCoachingBundles } from "~/surfaces/public-site/sections/pricing/coaching-bundles";
import { WaitlistAvailabilityStatus } from "~/features/waitlist/ui/public/availability-status";
import { WaitlistEmailForm } from "~/features/waitlist/ui/public/email-form";

export const meta: MetaFunction = () => [
  { title: "Pricing | Evoa" },
  {
    name: "description",
    content:
      "1-on-1 coaching bundle pricing for women who want personalized training, nutrition support, and accountability.",
  },
];

export default function PricingRoute() {
  const { botDetection, waitlist } = useOutletContext<PublicOutletContext>();
  const bundlePresentation = presentCoachingBundles({
    waitlistPricing: waitlist.bundleOfferPlan !== null,
  });

  return (
    <section className="mx-auto w-full max-w-stage pb-16 pt-4">
      <header className="mx-auto mb-16 max-w-3xl text-center">
        <h1 className="mb-6 font-heading text-4xl font-medium tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Coaching Plans
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-lg leading-7 text-copy-muted">
          {waitlist.mode === "disabled"
            ? "Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support."
            : waitlist.bundleOfferPlan
              ? "Join the waitlist and lock in reduced pricing on every coaching plan."
              : "Join the waitlist to hear when coaching opens."}
        </p>
      </header>

      <BundleSelector
        benefits={bundlePresentation.benefits}
        cards={bundlePresentation.cards}
        showsWaitlistPricing={bundlePresentation.showsWaitlistPricing}
      />

      <p className="mx-auto mb-14 max-w-2xl text-center text-sm leading-5 text-copy-muted">
        On the 3- and 6-month plans, you may cancel within the first 7 days if
        coaching is not the right fit. After that, the full plan commitment
        applies.
      </p>

      <section className="mx-auto w-full max-w-4xl rounded-md border border-stroke-faint bg-surface-base p-8 text-center shadow-sm md:p-12">
        {waitlist.mode === "disabled" ? (
          <AssessmentCallCta />
        ) : (
          <WaitlistPricingCta botDetection={botDetection} waitlist={waitlist} />
        )}
      </section>
    </section>
  );
}

function WaitlistPricingCta(props: {
  botDetection: PublicOutletContext["botDetection"];
  waitlist: PublicOutletContext["waitlist"];
}) {
  const { isClosed, isUnavailable, mode } = props.waitlist;
  const usesNeutralCopy = isUnavailable || isClosed;

  return (
    <>
      <h2 className="mb-4 font-heading text-2xl font-medium leading-8 text-text-primary">
        {usesNeutralCopy
          ? "Join the coaching waitlist"
          : "Interested in the waitlist price?"}
      </h2>
      <p className="mb-8 text-base leading-6 text-copy-muted">
        Leave your email and you'll be the first to know when spots open.
      </p>
      <WaitlistEmailForm
        botDetection={props.botDetection}
        mode={mode}
        variant="light"
      />
      <div className="mt-6">
        <WaitlistAvailabilityStatus
          status={props.waitlist.availabilityStatus}
          variant="light"
        />
      </div>
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
        To ensure we're the perfect fit, all 1-on-1 coaching begins with a
        complimentary assessment call. During this call, we'll discuss your
        goals and lay out a roadmap for your success.
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

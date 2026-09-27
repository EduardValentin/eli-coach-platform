import { ArrowRight } from "lucide-react";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  buttonVariants,
  cardVariants,
} from "@eli-coach-platform/ui/primitives";
import {
  Link,
  useLoaderData,
  useOutletContext,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { PublicOutletContext } from "~/surfaces/public-site/shell/layout";
import { BOOK_PATH } from "~/features/assessment-calls/contracts/paths";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { BundleSelector } from "~/features/coaching-sales/ui/public/bundle-selector/bundle-selector";
import { waitlistContext } from "~/features/waitlist/server/guards/waitlist-context.server";
import { WaitlistAvailabilityStatus } from "~/features/waitlist/ui/public/availability-status";
import { WaitlistEmailForm } from "~/features/waitlist/ui/public/email-form";
import { presentWaitlist } from "~/features/waitlist/ui/shared/waitlist-presentation";

export async function loader({ context }: LoaderFunctionArgs) {
  const { waitlist } = context.get(waitlistContext);
  const { showsBundleOffer } = presentWaitlist(await waitlist.getWaitlist());

  return {
    cards: context.get(coachingSalesContext).checkouts.loadPricingCards({
      tier: showsBundleOffer ? "reduced" : "regular",
    }),
    pricing: showsBundleOffer ? "waitlist" : "regular",
  } as const;
}

export const meta: MetaFunction = () => [
  { title: "Pricing | Evoa" },
  {
    name: "description",
    content:
      "1-on-1 coaching bundle pricing for women who want personalized training, nutrition support, and accountability.",
  },
];

export const handle = { publicContentFrame: "full-bleed" } as const;

export default function PricingRoute() {
  const { botDetection, waitlist } = useOutletContext<PublicOutletContext>();
  const { cards, pricing } = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto max-w-7xl px-6 pt-32 pb-24">
      <header className="mx-auto mb-16 max-w-3xl text-center">
        <h1 className="mb-6 font-heading text-4xl font-medium tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Coaching Plans
        </h1>
        <p className="mb-8 text-lg leading-7 text-copy-muted">
          {waitlist.mode === "disabled"
            ? "Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support."
            : waitlist.showsBundleOffer
              ? "Join the waitlist and lock in reduced pricing on every coaching plan."
              : "Join the waitlist to hear when coaching opens."}
        </p>
      </header>

      <BundleSelector cards={cards} mode="public" pricing={pricing} />

      <p className="mx-auto mb-14 max-w-2xl text-center text-sm leading-5 text-copy-muted">
        On the 3- and 6-month plans, you may cancel within the first 7 days if
        coaching is not the right fit. After that, the full plan commitment
        applies.
      </p>

      <section
        className={cn(
          cardVariants(),
          "mx-auto w-full max-w-4xl p-8 text-center md:p-12",
        )}
      >
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
        complimentary call, where we'll discuss your goals and lay out a roadmap
        for your success.
      </p>
      <Link
        className={buttonVariants({ elevation: "raised", size: "lg" })}
        to={BOOK_PATH}
      >
        Book a Call
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </>
  );
}

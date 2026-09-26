import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { AlertCircle, Calendar } from "lucide-react";
import { Link } from "react-router";

import { BOOK_PATH } from "~/features/assessment-calls/contracts/paths";

type CallFirstBannerProps = {
  heading: "h1" | "h2";
};

export function CallFirstBanner(props: CallFirstBannerProps) {
  const Heading = props.heading;

  return (
    <div
      className="relative z-10 w-full bg-brand-primary px-6 pt-24 pb-8 text-brand-primary-foreground shadow-md"
      data-parity="call-first-banner"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div className="flex items-start gap-4 md:items-center">
          <AlertCircle
            aria-hidden="true"
            className="hidden shrink-0 md:block"
            size={32}
          />
          <div>
            <Heading className="mb-1 font-heading text-xl font-medium md:text-2xl">
              A Call Comes First
            </Heading>
            <p className="text-sm text-brand-primary-foreground/90 md:text-base">
              You need a unique, secure token from your call with Eli to
              purchase a 1-on-1 coaching bundle.
            </p>
          </div>
        </div>
        <Link
          className={buttonVariants({
            corner: "control",
            size: "md-wide",
            variant: "on-brand",
          })}
          to={BOOK_PATH}
        >
          <Calendar aria-hidden="true" size={18} />
          Book a Call
        </Link>
      </div>
    </div>
  );
}

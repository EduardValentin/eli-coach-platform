import { cn } from "@eli-coach-platform/ui/lib";
import {
  buttonVariants,
  cardVariants,
} from "@eli-coach-platform/ui/primitives";
import { Check } from "lucide-react";
import {
  Link,
  useLoaderData,
  type HeadersArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { CheckoutConfirmation } from "~/features/coaching-sales/contracts/coaching-sales";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  CALL_FIRST_HEADING,
  CallFirstBanner,
} from "~/features/coaching-sales/ui/public/call-first-banner";

import {
  IMMEDIATE_START_SUMMARY,
  INVITATION_LEAD,
  INVITATION_TAIL,
  PAYMENT_CONFIRMED_HEADING,
  waitingStartSummary,
} from "./confirmation-copy";

type PaidConfirmation = Extract<CheckoutConfirmation, { state: "paid" }>;

export async function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(coachingSalesContext)
    .checkouts.loadConfirmation(args);
}

export function headers({ loaderHeaders }: HeadersArgs) {
  return loaderHeaders;
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${confirmationHeading(data)} | Evoa` },
  { name: "robots", content: "noindex" },
];

function confirmationHeading(confirmation?: CheckoutConfirmation): string {
  return confirmation?.state === "call-first"
    ? CALL_FIRST_HEADING
    : PAYMENT_CONFIRMED_HEADING;
}

export const handle = { publicContentFrame: "full-bleed" } as const;

export default function CheckoutCompleteRoute() {
  const confirmation = useLoaderData<typeof loader>();

  if (confirmation.state === "call-first") {
    return (
      <div className="min-h-screen bg-surface-page">
        <CallFirstBanner heading="h1" />
      </div>
    );
  }

  return <PaymentConfirmation confirmation={confirmation} />;
}

function PaymentConfirmation(props: { confirmation: PaidConfirmation }) {
  const { confirmation } = props;
  const startSummary =
    confirmation.startChoice === "immediate"
      ? IMMEDIATE_START_SUMMARY
      : waitingStartSummary(confirmation.waitingStartsOn);

  return (
    <div
      className="min-h-screen bg-surface-page px-4 pt-32 pb-16 sm:px-6"
      data-parity-root="CheckoutComplete"
    >
      <div
        className={cn(
          cardVariants({ variant: "panel" }),
          "mx-auto w-full max-w-xl px-6 py-10 sm:px-10",
        )}
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-surface text-feedback-success">
          <Check aria-hidden="true" size={28} />
        </span>

        <h1 className="mt-6 text-center font-heading text-display-sm text-text-primary">
          {PAYMENT_CONFIRMED_HEADING}
        </h1>

        <p className="mt-4 text-center text-base leading-relaxed text-text-secondary">
          {INVITATION_LEAD}{" "}
          <span className="font-medium text-text-primary">
            {confirmation.email}
          </span>
          {INVITATION_TAIL}
        </p>

        <dl className="mt-8 grid gap-3 rounded-card border border-border-subtle bg-surface-quiet px-5 py-4 text-sm">
          <Reading term="Bundle" value={confirmation.bundleTitle} />
          <Reading term="Amount" value={confirmation.amount} />
          <Reading term="Renews" value={confirmation.renewalLabel} />
          <Reading term="Your start" value={startSummary} />
        </dl>

        <div className="mt-8 flex justify-center">
          <Link className={buttonVariants({ variant: "outline" })} to="/">
            Back to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}

function Reading(props: { term: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
      data-parity={`reading-${props.term.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <dt className="text-text-secondary">{props.term}</dt>
      <dd className="font-medium text-text-primary sm:text-right">
        {props.value}
      </dd>
    </div>
  );
}

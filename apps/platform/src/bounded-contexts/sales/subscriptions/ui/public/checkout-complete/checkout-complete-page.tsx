import {
  ConfirmationActions,
  ConfirmationHeading,
  ConfirmationLead,
  ConfirmationPage,
  ConfirmationReading,
  ConfirmationReadings,
} from "~/shared/design-system/layout";
import { useCalendarDayTimeZone } from "~/shared/design-system/lib";
import { buttonVariants } from "~/shared/design-system/primitives";
import {
  Link,
  useLoaderData,
  type HeadersArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { CheckoutConfirmation } from "~/bounded-contexts/sales/subscriptions/public/subscriptions";
import { subscriptionsContext } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/context.server";
import {
  CALL_FIRST_HEADING,
  CallFirstBanner,
} from "~/bounded-contexts/sales/subscriptions/ui/public/call-first-banner";

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
    .get(subscriptionsContext)
    .checkoutsController.loadConfirmation(args);
}

export function headers({ loaderHeaders }: HeadersArgs) {
  return loaderHeaders;
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: `${confirmationHeading(loaderData)} | Evoa` },
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
  const timeZone = useCalendarDayTimeZone();
  const startSummary =
    confirmation.startChoice === "immediate"
      ? IMMEDIATE_START_SUMMARY
      : waitingStartSummary(confirmation.waitingStartsOn, timeZone);

  return (
    <ConfirmationPage data-parity-root="CheckoutComplete">
      <ConfirmationHeading outcome="confirmed">
        {PAYMENT_CONFIRMED_HEADING}
      </ConfirmationHeading>

      <ConfirmationLead>
        {INVITATION_LEAD}{" "}
        <span className="font-medium text-text-primary">
          {confirmation.email}
        </span>
        {INVITATION_TAIL}
      </ConfirmationLead>

      <ConfirmationReadings className="mt-8">
        <ConfirmationReading term="Bundle" value={confirmation.bundleTitle} />
        <ConfirmationReading term="Amount" value={confirmation.amount} />
        <ConfirmationReading term="Renews" value={confirmation.renewalLabel} />
        <ConfirmationReading term="Your start" value={startSummary} />
      </ConfirmationReadings>

      <ConfirmationActions>
        <Link className={buttonVariants({ variant: "outline" })} to="/">
          Back to the home page
        </Link>
      </ConfirmationActions>
    </ConfirmationPage>
  );
}

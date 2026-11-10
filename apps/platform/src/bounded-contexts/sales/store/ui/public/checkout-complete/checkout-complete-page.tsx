import { ELI_COACH_CONTACT_EMAIL } from "~/shared/brand";
import {
  ConfirmationActions,
  ConfirmationHeading,
  ConfirmationLead,
  ConfirmationPage,
} from "~/shared/design-system/layout";
import { cn, LABEL_CLASS } from "~/shared/design-system/lib";
import {
  Button,
  buttonVariants,
  linkVariants,
} from "~/shared/design-system/primitives";
import { AlertCircle, CheckCircle2, Clock, Loader2, Mail } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import {
  Link,
  useLoaderData,
  type HeadersArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import { storeContext } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import type { StoreOrderConfirmation } from "~/bounded-contexts/sales/store/public/store-orders";

import { useStoreCart } from "../cart/cart-provider";
import { StoreOrderSummary } from "../pricing/store-order-summary";
import {
  useStoreOrderEmailFetcher,
  type StoreOrderEmailOutcome,
} from "../api-client";

const ORDER_CONFIRMED_HEADING = "Order confirmed";
const PAYMENT_NOT_COMPLETED_HEADING = "Payment not completed";

type ConfirmedOrder = Extract<StoreOrderConfirmation, { status: "confirmed" }>;

export async function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(storeContext)
    .storeOrderController.loadConfirmation(args.url);
}

export function headers({ loaderHeaders }: HeadersArgs) {
  return loaderHeaders;
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: `${confirmationHeading(loaderData)} | Evoa` },
  { name: "robots", content: "noindex" },
];

export const handle = { publicContentFrame: "full-bleed" } as const;

function confirmationHeading(order?: StoreOrderConfirmation): string {
  return order?.status === "confirmed"
    ? ORDER_CONFIRMED_HEADING
    : PAYMENT_NOT_COMPLETED_HEADING;
}

export default function StoreCheckoutCompleteRoute() {
  const order = useLoaderData<typeof loader>();

  if (order.status === "confirmed") {
    return <ConfirmedOrderView order={order} />;
  }

  return (
    <ConfirmationPage data-parity-root="StoreOrderComplete">
      <ConfirmationHeading outcome="not-completed">
        {PAYMENT_NOT_COMPLETED_HEADING}
      </ConfirmationHeading>
      <ConfirmationLead data-parity="order-lead">
        We couldn&apos;t confirm a payment for this checkout. Head back to the
        store to try again.
      </ConfirmationLead>
      <BackToStore />
    </ConfirmationPage>
  );
}

function ConfirmedOrderView(props: { order: ConfirmedOrder }) {
  const { order } = props;
  const clearCart = useStoreCart((cart) => cart.clearCart);
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);
  const orderEmail = useStoreOrderEmailFetcher();
  const sendAgain = () => {
    if (orderEmail.isSubmitting) {
      return;
    }

    orderEmail.submit(order.sessionId);
  };

  useEffect(() => {
    if (isCartHydrated) {
      clearCart();
    }
  }, [clearCart, isCartHydrated]);

  return (
    <ConfirmationPage data-parity-root="StoreOrderComplete">
      <ConfirmationHeading outcome="confirmed">
        {ORDER_CONFIRMED_HEADING}
      </ConfirmationHeading>

      <ConfirmationLead data-parity="order-lead">
        Your order email is on its way to{" "}
        <span
          className="font-medium text-text-primary"
          data-parity="order-email"
        >
          {order.email}
        </span>
        . Your download link is in that email and works for seven days.
      </ConfirmationLead>

      <h2 className={cn("mt-8", LABEL_CLASS)}>Your order</h2>
      <StoreOrderSummary
        className="mt-2"
        currency={order.currency}
        lines={order.lines}
      />
      <p
        className="mt-3 text-sm text-text-secondary"
        data-parity="receipt-note"
      >
        Stripe sends your payment receipt in a separate email.
      </p>

      <div
        className="mt-8 border-t border-border-subtle pt-6 text-center"
        data-parity="resend-block"
      >
        <p className="text-sm text-text-secondary">
          Nothing in your inbox? Check your spam folder or send it again.
        </p>
        <Button
          aria-busy={orderEmail.isSubmitting || undefined}
          aria-disabled={orderEmail.isSubmitting || undefined}
          className="mt-4"
          onClick={sendAgain}
          variant="outline"
        >
          {orderEmail.isSubmitting ? (
            <Loader2
              aria-hidden="true"
              className="animate-spin motion-reduce:hidden"
              size={18}
            />
          ) : (
            <Mail aria-hidden="true" size={18} />
          )}
          Send my order email again
        </Button>
        <div
          className="mt-3 empty:hidden"
          data-parity="resend-feedback"
          role="status"
        >
          {orderEmail.outcome ? (
            <ResendFeedback email={order.email} outcome={orderEmail.outcome} />
          ) : null}
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          Still need help? Contact{" "}
          <a
            className={linkVariants({ variant: "in-text" })}
            href={`mailto:${ELI_COACH_CONTACT_EMAIL}`}
          >
            {ELI_COACH_CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>

      <BackToStore />
    </ConfirmationPage>
  );
}

function ResendFeedback(props: {
  email: string;
  outcome: StoreOrderEmailOutcome;
}) {
  if (props.outcome === "sent") {
    return (
      <FeedbackLine
        icon={
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-feedback-success"
            size={16}
          />
        }
      >
        Sent again to {props.email}. Use the newest email: links in earlier ones
        no longer work.
      </FeedbackLine>
    );
  }

  if (props.outcome === "processing") {
    return (
      <FeedbackLine
        icon={
          <Clock
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-brand-secondary"
            size={16}
          />
        }
      >
        Your order is still being processed. Your email will arrive shortly.
      </FeedbackLine>
    );
  }

  return (
    <FeedbackLine
      icon={
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-feedback-warning"
          size={16}
        />
      }
    >
      You can&apos;t send it again just yet. Please try again later.
    </FeedbackLine>
  );
}

function FeedbackLine(props: { children: ReactNode; icon: ReactNode }) {
  return (
    <p className="mx-auto flex max-w-sm items-start justify-center gap-2 text-left text-sm text-text-primary">
      {props.icon}
      <span>{props.children}</span>
    </p>
  );
}

function BackToStore() {
  return (
    <ConfirmationActions>
      <Link className={buttonVariants({ variant: "outline" })} to={STORE_PATH}>
        Back to the store
      </Link>
    </ConfirmationActions>
  );
}

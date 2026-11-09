import { buttonVariants } from "~/shared/design-system/primitives";
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

const ORDER_CONFIRMED_HEADING = "Order confirmed";
const PAYMENT_NOT_COMPLETED_HEADING = "Payment not completed";

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

function confirmationHeading(order?: StoreOrderConfirmation): string {
  return order?.status === "confirmed"
    ? ORDER_CONFIRMED_HEADING
    : PAYMENT_NOT_COMPLETED_HEADING;
}

export default function StoreCheckoutCompleteRoute() {
  const order = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="font-heading text-display-sm text-text-primary">
        {confirmationHeading(order)}
      </h1>
      {order.status === "confirmed" ? (
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          Your order email is on its way to{" "}
          <span className="font-medium text-text-primary">{order.email}</span>.
          Your download link is in that email and works for seven days.
        </p>
      ) : (
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          We couldn&apos;t confirm a payment for this checkout. Head back to the
          store to try again.
        </p>
      )}
      <div className="mt-8 flex justify-center">
        <Link
          className={buttonVariants({ variant: "outline" })}
          to={STORE_PATH}
        >
          Back to the store
        </Link>
      </div>
    </div>
  );
}

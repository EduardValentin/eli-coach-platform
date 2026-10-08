import { DeadEndPage } from "@eli-coach-platform/ui/layout";
import { CalendarX } from "lucide-react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { ClientEnded } from "~/features/coaching-sales/public/client-subscription";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";

import {
  COACHING_ENDED_LINE,
  COACHING_ENDED_META_TITLE,
  COACHING_ENDED_TITLE,
  REFUND_ON_ITS_WAY_LINE,
} from "./ended-copy";

export function loader(args: LoaderFunctionArgs): Promise<ClientEnded> {
  return args.context.get(coachingSalesContext).subscription.loadEnded(args);
}

export const meta: MetaFunction = () => [
  { title: COACHING_ENDED_META_TITLE },
  { name: "robots", content: "noindex" },
];

export default function EndedRoute() {
  const { refundDue } = useLoaderData<typeof loader>();

  return (
    <DeadEndPage
      data-parity-root="PortalEnded"
      description={COACHING_ENDED_LINE}
      detail={refundDue ? REFUND_ON_ITS_WAY_LINE : undefined}
      icon={<CalendarX aria-hidden="true" size={36} />}
      landmarkLabel={COACHING_ENDED_TITLE}
      title={COACHING_ENDED_TITLE}
    />
  );
}

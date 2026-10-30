import { DeadEndLink, DeadEndPage } from "~/shared/design-system/layout";
import { VideoOff } from "lucide-react";
import {
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { assessmentCallsContext } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/context.server";

export async function loader({ context, params }: LoaderFunctionArgs) {
  if (!params.bookingId) {
    throw new Response("Not Found", { status: 404 });
  }

  const link = await context
    .get(assessmentCallsContext)
    .assessmentCallsController.resolveJoin(params.bookingId);

  if (link.status === "found") {
    throw redirect(link.url, 302);
  }

  if (link.status === "link_not_set") {
    return { status: "link_not_set" } as const;
  }

  throw new Response("Not Found", { status: 404 });
}

export const meta: MetaFunction = () => [
  { title: "Call link not ready | Evoa" },
];

export default function AssessmentCallJoinRoute() {
  return (
    <div data-parity-root="JoinCall">
      <DeadEndPage
        description="The meeting room for this call hasn't been set up yet. Check back before your call, or reply to your confirmation email and we'll send the link."
        icon={<VideoOff aria-hidden="true" size={36} />}
        landmarkLabel="Your call"
        title="Your call link isn't ready yet"
      >
        <DeadEndLink direction="back" to="/">
          Back to home
        </DeadEndLink>
      </DeadEndPage>
    </div>
  );
}

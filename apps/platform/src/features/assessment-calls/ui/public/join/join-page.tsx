import { DeadEndPage } from "@eli-coach-platform/ui/layout";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { ArrowRight, VideoOff } from "lucide-react";
import {
  redirect,
  Link,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

export async function loader({ context, params }: LoaderFunctionArgs) {
  if (!params.bookingId) {
    throw new Response("Not Found", { status: 404 });
  }

  const link = await context
    .get(assessmentCallsContext)
    .assessmentCalls.resolveJoin(params.bookingId);

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
        eyebrow="Your call"
        icon={<VideoOff aria-hidden="true" size={36} />}
        landmarkLabel="Your call"
        title="Your call link isn't ready yet"
      >
        <Link
          className={buttonVariants({ size: "lg", variant: "inverted" })}
          to="/"
        >
          Back to home
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </DeadEndPage>
    </div>
  );
}

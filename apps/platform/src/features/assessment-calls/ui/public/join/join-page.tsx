import { Link } from "@eli-coach-platform/ui/primitives";
import { data, redirect, type LoaderFunctionArgs } from "react-router";

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

  return data({ status: "unavailable" } as const, { status: 404 });
}

export default function AssessmentCallJoinRoute() {
  return (
    <section className="mx-auto w-full max-w-2xl py-16">
      <h1 className="font-heading text-4xl leading-display-relaxed tracking-tight text-text-primary">
        This call link is not available
      </h1>
      <p className="mt-6 text-body-lg leading-copy-relaxed text-text-secondary">
        The link may have expired, or the call may already have happened. Open
        the link in your confirmation email, or reply to that email and we will
        sort it out together.
      </p>
      <Link className="mt-10" placement="standalone" to="/">
        Back to the home page
      </Link>
    </section>
  );
}

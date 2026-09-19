import { redirect, type LoaderFunctionArgs } from "react-router";

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

export default function AssessmentCallJoinRoute() {
  return <h1>Your call link isn't ready yet</h1>;
}

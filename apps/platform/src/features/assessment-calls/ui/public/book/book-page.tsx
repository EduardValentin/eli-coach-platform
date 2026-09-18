import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

export async function loader({ context }: LoaderFunctionArgs) {
  return context.get(assessmentCallsContext).assessmentCalls.loadBookingPage();
}

export function shouldRevalidate({
  defaultShouldRevalidate,
  formMethod,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod) {
    return false;
  }

  return defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [
  { title: "Book a Free Assessment Call | Evoa" },
  {
    name: "description",
    content: "Book a free assessment call with Eli and start your plan.",
  },
];

export default function AssessmentCallBookingRoute() {
  const page = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto w-full max-w-3xl py-16">
      <p className="text-label font-semibold uppercase tracking-wide text-brand-primary">
        Free assessment call
      </p>
      <h1 className="mt-3 font-heading text-4xl leading-display-relaxed tracking-tight text-text-primary">
        Start Your Plan
      </h1>
      {page.status === "open" ? (
        <h2 className="mt-10 font-heading text-2xl text-text-primary">
          Pick a date and time
        </h2>
      ) : (
        <p className="mt-10 text-body-lg leading-copy-relaxed text-text-secondary">
          We could not load the open times just now.
        </p>
      )}
    </section>
  );
}

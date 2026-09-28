import { cn } from "@eli-coach-platform/ui/lib";
import { Button, cardVariants } from "@eli-coach-platform/ui/primitives";
import { Heart } from "lucide-react";
import {
  Form,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { WelcomePage } from "~/features/coaching-sales/contracts/client-journey";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";

import {
  WELCOME_CLOSING,
  WELCOME_FORM_INTRO,
  WELCOME_OPENING,
  WELCOME_PACE,
  WELCOME_START_LABEL,
  WELCOME_TOGETHER,
  welcomeHeading,
} from "./welcome-copy";

export function loader(args: LoaderFunctionArgs): Promise<WelcomePage> {
  return args.context.get(coachingSalesContext).clientJourney.loadWelcome(args);
}

export function action(args: ActionFunctionArgs): Promise<Response> {
  return args.context
    .get(coachingSalesContext)
    .clientJourney.markWelcomeSeen(args);
}

export const meta: MetaFunction = () => [
  { title: "Welcome | Evoa" },
  { name: "robots", content: "noindex" },
];

export default function WelcomeRoute() {
  const { firstName, wording } = useLoaderData<typeof loader>();

  return (
    <main
      aria-label="Welcome"
      className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-12 sm:px-6 lg:py-20"
    >
      <div
        className={cn(
          cardVariants({ variant: "panel" }),
          "w-full max-w-reading px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16",
        )}
        data-parity-root="ClientWelcome"
      >
        <h1
          className="font-heading text-display-sm tracking-tight text-text-primary lg:text-display-md"
          data-parity="welcome-heading"
        >
          {welcomeHeading(firstName)}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-text-primary">
          {WELCOME_OPENING}{" "}
          <Heart
            aria-hidden="true"
            className="ml-0.5 inline animate-heartbeat align-[-0.1em] text-brand-primary motion-reduce:animate-none"
            fill="currentColor"
            size="0.9em"
          />
        </p>
        <div className="mt-4 grid gap-4 text-base leading-relaxed text-text-secondary">
          <p>{WELCOME_TOGETHER}</p>
          <p>{WELCOME_FORM_INTRO[wording]}</p>
          <p>{WELCOME_PACE}</p>
          <p>{WELCOME_CLOSING}</p>
        </div>
        <Form method="post">
          <Button className="mt-10" type="submit" width="full-below-sm">
            {WELCOME_START_LABEL}
          </Button>
        </Form>
      </div>
    </main>
  );
}

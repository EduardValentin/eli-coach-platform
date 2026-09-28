import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import type { OnboardingPage } from "~/features/client-onboarding/contracts/onboarding";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";

const ONBOARDING_HEADING = "Let's get you set up";

export function loader(args: LoaderFunctionArgs): Promise<OnboardingPage> {
  return args.context
    .get(clientOnboardingContext)
    .controller.loadOnboarding(args);
}

export const meta: MetaFunction = () => [
  { title: `${ONBOARDING_HEADING} | Evoa` },
  { name: "robots", content: "noindex" },
];

export default function OnboardingRoute() {
  return (
    <main aria-label={ONBOARDING_HEADING}>
      <h1>{ONBOARDING_HEADING}</h1>
    </main>
  );
}

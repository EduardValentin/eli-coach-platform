import { SectionEyebrow } from "@eli-coach-platform/ui/primitives";
import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { OnboardingPage } from "~/features/client-onboarding/contracts/onboarding";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";

import { OnboardingWizard } from "./onboarding-wizard";
import { UnitPreferenceProvider } from "./unit-preference-store";

const ONBOARDING_HEADING = "Let's get you set up";

const ONBOARDING_EYEBROW = "Welcome to Evoa";

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
  const page = useLoaderData<typeof loader>();

  return (
    <>
      <main
        aria-label={ONBOARDING_HEADING}
        className="min-h-screen bg-surface-page px-4 py-10 sm:px-6 lg:py-16"
      >
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-8 text-center" data-parity-root="OnboardingHeader">
            <SectionEyebrow className="mb-2">
              {ONBOARDING_EYEBROW}
            </SectionEyebrow>
            <h1 className="font-heading text-3xl tracking-tight text-text-primary lg:text-display-md">
              {ONBOARDING_HEADING}
            </h1>
          </div>
          <UnitPreferenceProvider preference={page.unitPreference}>
            <OnboardingWizard page={page} />
          </UnitPreferenceProvider>
        </div>
      </main>
      <Toaster />
    </>
  );
}

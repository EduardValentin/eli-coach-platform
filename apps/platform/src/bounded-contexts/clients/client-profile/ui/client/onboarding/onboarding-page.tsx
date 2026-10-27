import { SectionEyebrow } from "~/shared/design-system/primitives";
import type { ReactNode } from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { OnboardingPage } from "~/bounded-contexts/clients/client-profile/public/onboarding";
import { ANSWER_REQUEST_COPY } from "~/bounded-contexts/clients/client-profile/public/onboarding-review-copy";
import { clientOnboardingContext } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";

import { AnswerRequestCard } from "./answer-request-card";
import { OnboardingWizard } from "./onboarding-wizard";
import { UnitPreferenceProvider } from "./unit-preference-store";

type OnboardingHeader = { eyebrow: string; title: string };

const WIZARD_HEADER: OnboardingHeader = {
  eyebrow: "Welcome to Evoa",
  title: "Let's get you set up",
};

const ANSWER_HEADER: OnboardingHeader = {
  eyebrow: ANSWER_REQUEST_COPY.eyebrow,
  title: ANSWER_REQUEST_COPY.title,
};

function headerOf(page: OnboardingPage | undefined): OnboardingHeader {
  return page?.mode === "answer" ? ANSWER_HEADER : WIZARD_HEADER;
}

export function loader(args: LoaderFunctionArgs): Promise<OnboardingPage> {
  return args.context
    .get(clientOnboardingContext)
    .controller.loadOnboarding(args);
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: `${headerOf(loaderData).title} | Evoa` },
  { name: "robots", content: "noindex" },
];

function OnboardingShell({
  children,
  header,
}: {
  children: ReactNode;
  header: OnboardingHeader;
}) {
  return (
    <main
      aria-label={header.title}
      className="min-h-screen bg-surface-page px-4 py-10 sm:px-6 lg:py-16"
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center" data-parity-root="OnboardingHeader">
          <SectionEyebrow className="mb-2">{header.eyebrow}</SectionEyebrow>
          <h1 className="font-heading text-3xl tracking-tight text-text-primary lg:text-display-md">
            {header.title}
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}

export default function OnboardingRoute() {
  const page = useLoaderData<typeof loader>();

  return (
    <OnboardingShell header={headerOf(page)}>
      <UnitPreferenceProvider preference={page.unitPreference}>
        {page.mode === "answer" ? (
          <AnswerRequestCard page={page} />
        ) : (
          <OnboardingWizard page={page} />
        )}
      </UnitPreferenceProvider>
    </OnboardingShell>
  );
}

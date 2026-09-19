import { toast } from "@eli-coach-platform/ui/overlays";
import { useEffect } from "react";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  ASSESSMENT_CALL_SETTINGS_TOASTS,
  type AssessmentCallSettings,
} from "~/features/assessment-calls/contracts/assessment-call-settings";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

import { AssessmentCallSettingsSection } from "./assessment-call-settings-section";

export async function loader({ context }: LoaderFunctionArgs) {
  return context
    .get(assessmentCallsContext)
    .assessmentCallSettings.loadSettingsPage();
}

export const meta: MetaFunction = () => [{ title: "Settings | Evoa" }];

export default function CoachSettingsRoute() {
  const settings = useLoaderData<typeof loader>();

  return <CoachSettingsPage settings={settings} />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (
    !isRouteErrorResponse(error) ||
    (error.status !== 401 && error.status !== 403)
  ) {
    throw error;
  }

  return <RecoveredCoachSettingsPage />;
}

function RecoveredCoachSettingsPage() {
  const settings = useLoaderData<typeof loader>();

  useEffect(() => {
    toast.error(ASSESSMENT_CALL_SETTINGS_TOASTS.failed);
  }, []);

  return <CoachSettingsPage settings={settings} />;
}

function CoachSettingsPage(props: { settings: AssessmentCallSettings }) {
  return (
    <div
      className="mx-auto max-w-3xl space-y-6 pb-12 sm:space-y-8"
      data-parity-root="CoachSettings"
    >
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold leading-tight text-text-primary md:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-text-muted">
          Manage how you take assessment calls and how measurements are shown.
        </p>
      </header>

      <AssessmentCallSettingsSection settings={props.settings} />
    </div>
  );
}

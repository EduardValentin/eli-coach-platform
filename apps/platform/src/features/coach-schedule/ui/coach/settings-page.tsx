import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { CoachScheduleSettings } from "~/features/coach-schedule/public/coach-schedule-settings";
import { coachScheduleContext } from "~/features/coach-schedule/server/guards/coach-schedule-context.server";

import { CoachScheduleSettingsSection } from "./coach-schedule-settings-section";

export async function loader({ context }: LoaderFunctionArgs) {
  return context
    .get(coachScheduleContext)
    .coachScheduleSettings.loadSettingsPage();
}

export const meta: MetaFunction = () => [{ title: "Settings | Evoa" }];

export default function CoachSettingsRoute() {
  const settings = useLoaderData<typeof loader>();

  return <CoachSettingsPage settings={settings} />;
}

function CoachSettingsPage(props: { settings: CoachScheduleSettings }) {
  return (
    <div
      className="w-full max-w-3xl space-y-6 sm:space-y-8"
      data-parity-root="CoachSettings"
    >
      <PortalPageHeader
        subtitle="Manage when you take calls and check-ins and how measurements are shown."
        title="Settings"
      />

      <CoachScheduleSettingsSection settings={props.settings} />
    </div>
  );
}

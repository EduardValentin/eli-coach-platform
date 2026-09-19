import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

export async function loader({ context }: LoaderFunctionArgs) {
  return context
    .get(assessmentCallsContext)
    .assessmentCallSettings.loadSettingsPage();
}

export const meta: MetaFunction = () => [{ title: "Settings | Evoa" }];

export default function CoachSettingsRoute() {
  return (
    <div>
      <h1>Settings</h1>
      <pre></pre>
    </div>
  );
}

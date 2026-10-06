import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { ClientSettings } from "~/features/coaching-sales/contracts/client-subscription";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";

import { SETTINGS_META_TITLE, SETTINGS_TITLE } from "./subscription-copy";
import { SubscriptionSection } from "./subscription-section";

export function loader(args: LoaderFunctionArgs): Promise<ClientSettings> {
  return args.context.get(coachingSalesContext).subscription.loadSettings(args);
}

export const meta: MetaFunction = () => [
  { title: SETTINGS_META_TITLE },
  { name: "description", content: pwaSurfaceDefinitions.client.description },
  { name: "theme-color", content: pwaSurfaceDefinitions.client.themeColor },
];

export default function ClientSettingsRoute() {
  const settings = useLoaderData<typeof loader>();

  return (
    <div
      className="w-full max-w-3xl space-y-6 sm:space-y-8"
      data-parity-root="ClientSettings"
    >
      <PortalPageHeader title={SETTINGS_TITLE} />
      <SubscriptionSection settings={settings} />
    </div>
  );
}

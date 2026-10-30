import { pwaSurfaceDefinitions } from "~/shared/pwa";
import { PortalPageHeader } from "~/shared/design-system/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { ClientSettingsView } from "~/bounded-contexts/clients/client-profile/public/client-settings";
import type { OwnClientProfileView } from "~/bounded-contexts/clients/client-profile/public/own-client-profile";
import { clientProfileContext } from "~/bounded-contexts/clients/public/request-context";
import { PreferencesSection } from "~/bounded-contexts/clients/client-profile/ui/client/settings/preferences-section";
import { UnitsSection } from "~/bounded-contexts/clients/client-profile/ui/client/settings/units-section";
import type { ClientSettings } from "~/bounded-contexts/sales/coaching-sales/public/client-subscription";
import { coachingSalesContext } from "~/bounded-contexts/sales/public/request-context";
import { SubscriptionSection } from "~/bounded-contexts/sales/coaching-sales/ui/client/settings/subscription-section";

type SettingsPage = {
  subscription: ClientSettings;
  clientSettings: ClientSettingsView;
  profile: OwnClientProfileView;
};

export async function loader(args: LoaderFunctionArgs): Promise<SettingsPage> {
  const { clientSettingsController, ownClientProfileController } =
    args.context.get(clientProfileContext);
  const [subscription, clientSettings, profile] = await Promise.all([
    args.context
      .get(coachingSalesContext)
      .subscriptionController.loadSettings(args),
    clientSettingsController.load(args),
    ownClientProfileController.load(args),
  ]);

  return { subscription, clientSettings, profile };
}

export const meta: MetaFunction = () => [
  { title: "Settings | Evoa" },
  { name: "description", content: pwaSurfaceDefinitions.client.description },
  { name: "theme-color", content: pwaSurfaceDefinitions.client.themeColor },
];

export default function ClientSettingsRoute() {
  const { subscription, clientSettings, profile } =
    useLoaderData<typeof loader>();

  return (
    <div
      className="w-full max-w-3xl space-y-6 sm:space-y-8"
      data-parity-root="ClientSettings"
    >
      <PortalPageHeader
        subtitle="Your coaching, and how your measurements are shown across the app."
        title="Settings"
      />
      <SubscriptionSection settings={subscription} />
      <div data-parity="unit-preferences">
        <UnitsSection
          sample={{
            heightCm: profile.coaching?.heightCm ?? null,
            weightKg: profile.currentWeightKg,
          }}
          units={clientSettings.units}
        />
      </div>
      {profile.coaching && <PreferencesSection settings={clientSettings} />}
    </div>
  );
}

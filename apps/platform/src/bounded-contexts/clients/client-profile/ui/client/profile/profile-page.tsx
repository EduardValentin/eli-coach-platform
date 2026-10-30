import { pwaSurfaceDefinitions } from "~/shared/pwa";
import { PortalPageHeader } from "~/shared/design-system/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { MeasurementsPage } from "~/bounded-contexts/clients/client-profile/public/measurements";
import type { OwnClientProfileView } from "~/bounded-contexts/clients/client-profile/public/own-client-profile";
import { CLIENT_PROFILE_API_PATHS } from "~/bounded-contexts/clients/client-profile/public/paths";
import { CLIENT_PROFILE_PAGE_COPY } from "~/bounded-contexts/clients/client-profile/public/profile-page-copy";
import { clientProfileContext } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
import { MeasurementsSection } from "~/bounded-contexts/clients/client-profile/ui/client/measurements/measurements-section";
import { AboutYouForm } from "~/bounded-contexts/clients/client-profile/ui/client/profile/about-you-form";
import { CoachFactsSection } from "~/bounded-contexts/clients/client-profile/ui/client/profile/coach-facts-section";
import { TrainingForm } from "~/bounded-contexts/clients/client-profile/ui/client/profile/training-form";
import { AvatarField } from "~/bounded-contexts/clients/client-profile/ui/shared/avatar/avatar-field";
import { clientFullName } from "~/bounded-contexts/clients/clients/public/clients";

type ClientProfilePage = {
  profile: OwnClientProfileView;
  measurements: MeasurementsPage;
};

export async function loader(
  args: LoaderFunctionArgs,
): Promise<ClientProfilePage> {
  const { clientMeasurementsController, ownClientProfileController } =
    args.context.get(clientProfileContext);
  const [profile, measurements] = await Promise.all([
    ownClientProfileController.load(args),
    clientMeasurementsController.loadPage(args),
  ]);

  return { profile, measurements };
}

export const meta: MetaFunction = () => [
  { title: CLIENT_PROFILE_PAGE_COPY.metaTitle },
  { name: "description", content: pwaSurfaceDefinitions.client.description },
  { name: "theme-color", content: pwaSurfaceDefinitions.client.themeColor },
];

export default function ClientProfileRoute() {
  const { profile, measurements } = useLoaderData<typeof loader>();
  const { coaching, identity } = profile;

  return (
    <div className="w-full max-w-3xl">
      <div data-parity-root="ClientProfileHeader">
        <PortalPageHeader
          subtitle={CLIENT_PROFILE_PAGE_COPY.subtitle}
          title={CLIENT_PROFILE_PAGE_COPY.title}
        />
      </div>

      <div className="space-y-6 sm:space-y-8">
        <AvatarField
          avatarEndpoint={CLIENT_PROFILE_API_PATHS.avatars}
          avatarUrl={profile.avatarUrl}
          clientName={clientFullName(identity)}
          email={identity.email}
        />
        <AboutYouForm identity={identity} />
        {coaching && (
          <>
            <TrainingForm
              coaching={coaching}
              unitPreference={measurements.units}
            />
            <CoachFactsSection
              profile={{ ...profile, coaching }}
              unitPreference={measurements.units}
            />
          </>
        )}
      </div>

      <MeasurementsSection page={measurements} />
    </div>
  );
}

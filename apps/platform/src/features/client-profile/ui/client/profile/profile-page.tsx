import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { MeasurementsPage } from "~/features/client-profile/public/measurements";
import type { OwnClientProfileView } from "~/features/client-profile/public/own-client-profile";
import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/public/paths";
import { CLIENT_PROFILE_PAGE_COPY } from "~/features/client-profile/public/profile-page-copy";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import { MeasurementsSection } from "~/features/client-profile/ui/client/measurements/measurements-section";
import { AboutYouForm } from "~/features/client-profile/ui/client/profile/about-you-form";
import { CoachFactsSection } from "~/features/client-profile/ui/client/profile/coach-facts-section";
import { TrainingForm } from "~/features/client-profile/ui/client/profile/training-form";
import { AvatarField } from "~/features/client-profile/ui/shared/avatar/avatar-field";

type ClientProfilePage = {
  profile: OwnClientProfileView;
  measurements: MeasurementsPage;
};

export async function loader(
  args: LoaderFunctionArgs,
): Promise<ClientProfilePage> {
  const { clientMeasurements, ownProfile } =
    args.context.get(clientProfileContext);
  const [profile, measurements] = await Promise.all([
    ownProfile.load(args),
    clientMeasurements.loadPage(args),
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
          action={CLIENT_PROFILE_API_PATHS.avatars}
          avatarUrl={profile.avatarUrl}
          detail={identity.email}
          name={`${identity.firstName} ${identity.lastName}`}
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

import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  CLIENT_PROFILE_PAGE_COPY,
  type MeasurementsPage,
} from "~/features/client-profile/contracts/measurements";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import { MeasurementsSection } from "~/features/client-profile/ui/client/measurements/measurements-section";

export function loader(args: LoaderFunctionArgs): Promise<MeasurementsPage> {
  return args.context
    .get(clientProfileContext)
    .clientMeasurements.loadPage(args);
}

export const meta: MetaFunction = () => [
  { title: CLIENT_PROFILE_PAGE_COPY.metaTitle },
  { name: "description", content: pwaSurfaceDefinitions.client.description },
  { name: "theme-color", content: pwaSurfaceDefinitions.client.themeColor },
];

export default function ClientProfileRoute() {
  const page = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div data-parity-root="ClientProfileHeader">
        <PortalPageHeader
          subtitle={CLIENT_PROFILE_PAGE_COPY.subtitle}
          title={CLIENT_PROFILE_PAGE_COPY.title}
        />
      </div>

      <MeasurementsSection page={page} />
    </div>
  );
}

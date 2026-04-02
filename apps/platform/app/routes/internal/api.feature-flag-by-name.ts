import type { LoaderFunctionArgs } from "react-router";
import { handleFeatureFlagRequest } from "../../modules/feature-flags/feature-flag-api.server";
import { getPlatformContainer } from "../../server/container.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return handleFeatureFlagRequest(request, {
    featureFlagReader: getPlatformContainer().featureFlagReader,
  });
}

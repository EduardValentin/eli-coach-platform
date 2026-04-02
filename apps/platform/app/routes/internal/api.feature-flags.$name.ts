import type { LoaderFunctionArgs } from "react-router";
import { handleFeatureFlagRequest } from "../../modules/feature-flags/feature-flag-api.server";
import { getFeatureFlagService } from "../../modules/feature-flags/feature-flag-service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return handleFeatureFlagRequest(request, {
    featureFlagReader: getFeatureFlagService(),
  });
}

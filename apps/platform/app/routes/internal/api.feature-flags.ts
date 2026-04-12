import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleFeatureFlagsRequest } from "~/modules/feature-flags/feature-flag-api.server";
import { getPlatformContainer } from "~/server/container.server";

export async function action({ request }: ActionFunctionArgs) {
  return handleFeatureFlagsRequest(request, {
    featureFlagService: getPlatformContainer().featureFlagService,
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handleFeatureFlagsRequest(request, {
    featureFlagService: getPlatformContainer().featureFlagService,
  });
}

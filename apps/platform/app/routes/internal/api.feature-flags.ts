import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getPlatformContainer } from "~/server/container.server";

const featureFlagController = getPlatformContainer().featureFlagController;

export async function action({ request }: ActionFunctionArgs) {
  return featureFlagController.handle(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return featureFlagController.handle(request);
}

import { featureFlagValueSchema } from "@eli-coach-platform/contracts";
import type { FeatureFlagReader } from "@eli-coach-platform/domain";

type FeatureFlagApiDependencies = {
  featureFlagReader: FeatureFlagReader;
};

function extractFeatureFlagName(request: Request): string {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split("/").filter(Boolean);

  return decodeURIComponent(pathSegments.at(-1) ?? "");
}

export async function handleFeatureFlagRequest(
  request: Request,
  dependencies: FeatureFlagApiDependencies,
): Promise<Response> {
  const featureFlagName = extractFeatureFlagName(request);

  if (!featureFlagName) {
    return Response.json({ message: "Feature flag name is required." }, { status: 400 });
  }

  const featureFlag = featureFlagValueSchema.parse({
    name: featureFlagName,
    enabled: await dependencies.featureFlagReader.getFlag(featureFlagName),
  });

  return Response.json(featureFlag);
}

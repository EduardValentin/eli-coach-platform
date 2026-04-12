import {
  featureFlagSnapshotRequestSchema,
  featureFlagSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { FeatureFlagReader } from "@eli-coach-platform/domain";
import {
  createBadRequestResponse,
  createMethodNotAllowedResponse,
  readJsonRequestBody,
} from "~/server/http.server";

type FeatureFlagApiDependencies = {
  featureFlagService: FeatureFlagReader;
}

export async function handleFeatureFlagsRequest(
  request: Request,
  dependencies: FeatureFlagApiDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    return createMethodNotAllowedResponse({
      allowedMethods: ["POST"],
    });
  }

  let parsedRequest: ReturnType<typeof featureFlagSnapshotRequestSchema.parse>;

  try {
    parsedRequest = featureFlagSnapshotRequestSchema.parse(
      await readJsonRequestBody<unknown>(request, {
        emptyBodyValue: {},
      }),
    );
  } catch {
    return createBadRequestResponse("Invalid feature flag request body.");
  }

  const featureFlags = await dependencies.featureFlagService.getFeatureFlags(
    parsedRequest.context,
  );
  const responseBody = featureFlagSnapshotSchema.parse({
    flags: featureFlags,
  });

  return Response.json(responseBody);
}

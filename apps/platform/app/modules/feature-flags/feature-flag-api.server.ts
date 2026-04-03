import {
  featureFlagSnapshotRequestSchema,
  featureFlagSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { FeatureFlagReader } from "@eli-coach-platform/domain";

type FeatureFlagApiDependencies = {
  featureFlagReader: FeatureFlagReader;
};

function createMethodNotAllowedResponse(): Response {
  return new Response("Method Not Allowed", {
    headers: {
      allow: "POST",
    },
    status: 405,
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  const body = await request.text();

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

export async function handleFeatureFlagsRequest(
  request: Request,
  dependencies: FeatureFlagApiDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    return createMethodNotAllowedResponse();
  }

  let parsedRequest: ReturnType<typeof featureFlagSnapshotRequestSchema.parse>;

  try {
    parsedRequest = featureFlagSnapshotRequestSchema.parse(await readJsonBody(request));
  } catch {
    return Response.json({ message: "Invalid feature flag request body." }, { status: 400 });
  }

  const featureFlags = await dependencies.featureFlagReader.getFeatureFlags(parsedRequest.context);
  const responseBody = featureFlagSnapshotSchema.parse({
    flags: featureFlags,
  });

  return Response.json(responseBody);
}

import { joinBasePath } from "@eli-coach-platform/config";
import { useMutation } from "@tanstack/react-query";

import {
  onboardClientResponseSchema,
  type OnboardClientRequest,
  type OnboardClientResponse,
} from "~/features/client-onboarding/contracts/client-onboarding";

export const ONBOARD_CLIENT_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/client-onboarding",
);

export function useOnboardClientMutation() {
  return useMutation<OnboardClientResponse, Error, OnboardClientRequest>({
    mutationFn: submitOnboardClient,
  });
}

export async function submitOnboardClient(
  request: OnboardClientRequest,
): Promise<OnboardClientResponse> {
  try {
    const response = await fetch(ONBOARD_CLIENT_API_URL, {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const parsedResponse = onboardClientResponseSchema.safeParse(
      await response.json(),
    );

    return parsedResponse.success
      ? parsedResponse.data
      : createOnboardClientServerErrorResponse();
  } catch {
    // A request that never produced a response leaves the send in doubt, so it
    // is reported as a failure the coach can retry rather than thrown, which
    // would settle the mutation with nothing on screen to explain it.
    return createOnboardClientServerErrorResponse();
  }
}

function createOnboardClientServerErrorResponse(): OnboardClientResponse {
  return {
    error: {
      code: "server_error",
      message: "Something went wrong. Try sending the invitation again.",
    },
    success: false,
  };
}

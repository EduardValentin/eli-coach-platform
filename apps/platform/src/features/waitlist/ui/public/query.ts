import { joinBasePath } from "@eli-coach-platform/config";
import {
  waitlistJoinResponseSchema,
  type WaitlistJoinResponse,
} from "~/features/waitlist/contracts/waitlist";
import { useMutation } from "@tanstack/react-query";

import { createWaitlistServerErrorResponse } from "./errors";

const WAITLIST_API_PATH = "/api/waitlist";
export const WAITLIST_API_URL = joinBasePath(import.meta.env.BASE_URL, WAITLIST_API_PATH);

type SubmitWaitlistOptions = {
  formData: FormData;
};

export function useJoinWaitlistMutation() {
  return useMutation({
    mutationFn: (formData: FormData) => submitWaitlist({ formData }),
  });
}

export async function submitWaitlist(
  options: SubmitWaitlistOptions,
): Promise<WaitlistJoinResponse> {
  try {
    const response = await fetch(WAITLIST_API_URL, {
      body: options.formData,
      headers: {
        Accept: "application/json",
      },
      method: "POST",
    });
    const result = waitlistJoinResponseSchema.safeParse(await response.json());

    return result.success ? result.data : createWaitlistServerErrorResponse();
  } catch {
    return createWaitlistServerErrorResponse();
  }
}

import { readTextRequestBody } from "@eli-coach-platform/infrastructure/http/server";
import { z } from "zod";

import {
  checkInOutcomeSchema,
  checkInRefusalSchema,
  type CheckInOutcomeReply,
  type CheckInRefusalReply,
} from "~/features/check-ins/public/check-ins";

const CONFLICT = 409;
const CHECK_IN_BODY_MAX_BYTES = 16 * 1024;

export const checkInIdSchema = z.uuid();

export function checkInOutcomeResponse(
  outcome: CheckInOutcomeReply,
  init: { status: number },
): Response {
  return Response.json(checkInOutcomeSchema.parse(outcome), init);
}

export function refusedCheckIn(
  error: CheckInRefusalReply["error"],
  init: { status: number } = { status: CONFLICT },
): Response {
  return Response.json(checkInRefusalSchema.parse({ error }), init);
}

export function unknownCheckIn(): Response {
  return new Response("Not Found", { status: 404 });
}

export async function readCheckInBody(request: Request): Promise<unknown> {
  const body = await readTextRequestBody(request, {
    maxBytes: CHECK_IN_BODY_MAX_BYTES,
  });

  if (body.status !== "valid") {
    return undefined;
  }

  if (body.text.trim() === "") {
    return {};
  }

  try {
    return JSON.parse(body.text);
  } catch {
    return undefined;
  }
}

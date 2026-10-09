import { z } from "zod";

import {
  checkInOutcomeSchema,
  checkInRefusalSchema,
  type CheckInOutcomeReply,
  type CheckInRefusalReply,
} from "~/features/check-ins/public/check-ins";

const CONFLICT = 409;

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

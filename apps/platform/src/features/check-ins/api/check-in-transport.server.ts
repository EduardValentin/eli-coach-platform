import { z } from "zod";

import {
  checkInAnswerSchema,
  checkInRefusalSchema,
  type CheckInAnswer,
  type CheckInRefusalAnswer,
} from "~/features/check-ins/public/check-ins";

const CONFLICT = 409;

export const checkInIdSchema = z.uuid();

export function answeredCheckIn(
  answer: CheckInAnswer,
  init: { status: number },
): Response {
  return Response.json(checkInAnswerSchema.parse(answer), init);
}

export function refusedCheckIn(
  error: CheckInRefusalAnswer["error"],
  init: { status: number } = { status: CONFLICT },
): Response {
  return Response.json(checkInRefusalSchema.parse({ error }), init);
}

export function unknownCheckIn(): Response {
  return new Response("Not Found", { status: 404 });
}

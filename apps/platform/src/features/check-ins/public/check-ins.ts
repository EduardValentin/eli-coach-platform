import {
  CHECK_IN_KINDS,
  CHECK_IN_PARTIES,
  RECORDED_CHECK_IN_STATUSES,
  type CheckInView,
} from "@eli-coach-platform/domain/check-in";
import { z } from "zod";

const CHECK_IN_STATUSES = [...RECORDED_CHECK_IN_STATUSES, "passed"] as const;

const CHECK_IN_ANSWERS = [
  "requested",
  "withdrawn",
  "approved",
  "declined",
] as const;

const CHECK_IN_REFUSALS = [
  "invalid_request",
  "note_too_long",
  "invalid_time_zone",
  "request_waiting",
  "time_taken",
  "not_pending",
  "ended",
] as const;

const checkInSchema = z.object({
  id: z.uuid(),
  kind: z.enum(CHECK_IN_KINDS),
  status: z.enum(CHECK_IN_STATUSES),
  initiatedBy: z.enum(CHECK_IN_PARTIES),
  proposedBy: z.enum(CHECK_IN_PARTIES),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  joinEmphasisFrom: z.iso.datetime(),
  note: z.string().nullable(),
});

const coachCheckInSchema = checkInSchema.extend({
  client: z.object({ firstName: z.string(), lastName: z.string() }),
});

export const clientCheckInsSchema = z.object({
  checkIns: z.array(checkInSchema),
});

export type ClientCheckIns = z.infer<typeof clientCheckInsSchema>;

export const coachCheckInsSchema = z.object({
  checkIns: z.array(coachCheckInSchema),
});

export type CoachCheckIns = z.infer<typeof coachCheckInsSchema>;

export type CoachCheckIn = CoachCheckIns["checkIns"][number];

export const openCheckInTimesSchema = z.object({
  times: z.array(z.iso.datetime()),
});

export const checkInRequestSchema = z.object({
  startsAt: z.iso.datetime(),
  timeZone: z.string().min(1),
  note: z.string().nullish(),
});

export const checkInAnswerSchema = z.object({
  status: z.enum(CHECK_IN_ANSWERS),
  checkInId: z.uuid(),
});

export type CheckInAnswer = z.infer<typeof checkInAnswerSchema>;

export const checkInRefusalSchema = z.object({
  error: z.enum(CHECK_IN_REFUSALS),
});

export type CheckInRefusalAnswer = z.infer<typeof checkInRefusalSchema>;

export function presentCheckIn(
  view: CheckInView,
): ClientCheckIns["checkIns"][number] {
  return {
    id: view.id,
    kind: view.kind,
    status: view.status,
    initiatedBy: view.initiatedBy,
    proposedBy: view.proposedBy,
    startsAt: view.startsAt.toISOString(),
    endsAt: view.endsAt.toISOString(),
    joinEmphasisFrom: view.joinEmphasisFrom.toISOString(),
    note: view.note,
  };
}

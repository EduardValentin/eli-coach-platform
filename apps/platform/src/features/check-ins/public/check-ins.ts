import {
  CHECK_IN_KINDS,
  CHECK_IN_PARTIES,
  RECORDED_CHECK_IN_STATUSES,
  type CheckInView,
  type ClientCheckInScheduling,
} from "@eli-coach-platform/domain/check-in";
import { z } from "zod";

const CHECK_IN_STATUSES = [...RECORDED_CHECK_IN_STATUSES, "passed"] as const;

const CHECK_IN_OUTCOMES = [
  "requested",
  "scheduled",
  "withdrawn",
  "approved",
  "declined",
  "proposed",
  "cancelled",
] as const;

const CHECK_IN_REFUSALS = [
  "invalid_request",
  "note_too_long",
  "invalid_time_zone",
  "request_waiting",
  "client_cannot_answer",
  "time_taken",
  "moves_exhausted",
  "not_pending",
  "ended",
] as const;

const CHECK_IN_VIEWER_PROPOSALS = ["allowed", "exhausted", "none"] as const;

const checkInSchema = z.object({
  id: z.uuid(),
  kind: z.enum(CHECK_IN_KINDS),
  status: z.enum(CHECK_IN_STATUSES),
  initiatedBy: z.enum(CHECK_IN_PARTIES),
  proposedBy: z.enum(CHECK_IN_PARTIES),
  awaitsViewer: z.boolean(),
  viewerMayWithdraw: z.boolean(),
  viewerProposal: z.enum(CHECK_IN_VIEWER_PROPOSALS),
  viewerMayCancel: z.boolean(),
  newTimeWaits: z.boolean(),
  isWaitingRequest: z.boolean(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  joinEmphasisFrom: z.iso.datetime(),
  earlierStartsAt: z.iso.datetime().nullable(),
  moves: z.number().int().nonnegative(),
  note: z.string().nullable(),
  newTimeNote: z.string().nullable(),
});

const coachCheckInSchema = checkInSchema.extend({
  clientId: z.uuid(),
  client: z.object({ firstName: z.string(), lastName: z.string() }),
});

export const clientCheckInSchema = checkInSchema;

export type ClientCheckIn = z.infer<typeof clientCheckInSchema>;

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

export const checkInScheduleSchema = z.object({
  clientId: z.uuid(),
  startsAt: z.iso.datetime(),
  note: z.string().nullish(),
});

export const checkInAnswerSchema = z.object({
  timeZone: z.string().min(1).optional(),
});

export const checkInNewTimeSchema = z.object({
  startsAt: z.iso.datetime(),
  note: z.string().nullish(),
  timeZone: z.string().min(1).optional(),
});

export const openCheckInTimesQuerySchema = z.object({
  clientId: z.uuid().optional(),
});

export type CheckInScheduling = Exclude<ClientCheckInScheduling, "unknown">;

export const checkInOutcomeSchema = z.object({
  status: z.enum(CHECK_IN_OUTCOMES),
  checkInId: z.uuid(),
});

export type CheckInOutcomeReply = z.infer<typeof checkInOutcomeSchema>;

export const checkInRefusalSchema = z.object({
  error: z.enum(CHECK_IN_REFUSALS),
});

export type CheckInRefusalReply = z.infer<typeof checkInRefusalSchema>;

export function presentCheckIn(view: CheckInView): ClientCheckIn {
  return {
    id: view.id,
    kind: view.kind,
    status: view.status,
    initiatedBy: view.initiatedBy,
    proposedBy: view.proposedBy,
    awaitsViewer: view.awaitsViewer,
    viewerMayWithdraw: view.viewerMayWithdraw,
    viewerProposal: view.viewerProposal,
    viewerMayCancel: view.viewerMayCancel,
    newTimeWaits: view.newTimeWaits,
    isWaitingRequest: view.isWaitingRequest,
    startsAt: view.startsAt.toISOString(),
    endsAt: view.endsAt.toISOString(),
    joinEmphasisFrom: view.joinEmphasisFrom.toISOString(),
    earlierStartsAt: view.earlierStartsAt?.toISOString() ?? null,
    moves: view.moves,
    note: view.note,
    newTimeNote: view.newTimeNote,
  };
}

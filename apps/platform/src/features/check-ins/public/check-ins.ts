import {
  CHECK_IN_KINDS,
  CHECK_IN_PARTIES,
  RECORDED_CHECK_IN_STATUSES,
  type CheckInTab,
  type CheckInView,
  type ClientCheckInScheduling,
  type CoachCheckInView,
} from "@eli-coach-platform/domain/check-in";
import { WEEKDAYS } from "@eli-coach-platform/domain/coach-availability";
import { z } from "zod";

const CHECK_IN_STATUSES = [...RECORDED_CHECK_IN_STATUSES, "passed"] as const;

const CHECK_IN_TABS = [
  "upcoming",
  "requests",
  "past",
] as const satisfies readonly CheckInTab[];

export const LAST_HOUR_OF_DAY = 23;

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
  "not_next_weekly",
  "not_pending",
  "ended",
  "series_exists",
  "outside_availability",
  "nothing_to_create",
  "changed_meanwhile",
] as const;

const CHECK_IN_SERIES_OUTCOMES = ["set_up", "changed", "stopped"] as const;

const CHECK_IN_VIEWER_PROPOSALS = ["allowed", "exhausted", "none"] as const;

const checkInSchema = z.object({
  id: z.uuid(),
  seriesId: z.uuid().nullable(),
  kind: z.enum(CHECK_IN_KINDS),
  status: z.enum(CHECK_IN_STATUSES),
  tab: z.enum(CHECK_IN_TABS),
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

const weekdaySchema = z.enum(WEEKDAYS);

const hourSchema = z.number().int().min(0).max(LAST_HOUR_OF_DAY);

const checkInSeriesSchema = z.object({
  id: z.uuid(),
  weekday: weekdaySchema,
  hour: hourSchema,
  timeZone: z.string().min(1),
});

export const coachClientSeriesSchema = z.object({
  series: checkInSeriesSchema.nullable(),
  weeks: z.array(coachCheckInSchema),
  coachingEnds: z.boolean(),
});

export type CoachClientSeriesPanel = z.infer<typeof coachClientSeriesSchema>;

export const checkInSeriesSetUpSchema = z.object({
  clientId: z.uuid(),
  weekday: weekdaySchema,
  hour: hourSchema,
});

export const checkInSeriesChangeSchema = z.object({
  weekday: weekdaySchema,
  hour: hourSchema,
});

export const checkInSeriesPreviewQuerySchema = z.object({
  clientId: z.uuid(),
  weekday: weekdaySchema,
});

export const checkInSeriesPreviewSchema = z.object({
  weekdays: z.array(weekdaySchema),
  hours: z.array(
    z.object({
      hour: hourSchema,
      weeks: z.number().int().nonnegative(),
      clashes: z.number().int().nonnegative(),
    }),
  ),
});

export const checkInSeriesOutcomeSchema = z.object({
  status: z.enum(CHECK_IN_SERIES_OUTCOMES),
  seriesId: z.uuid(),
});

export type CheckInSeriesOutcomeReply = z.infer<
  typeof checkInSeriesOutcomeSchema
>;

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
    seriesId: view.seriesId,
    kind: view.kind,
    status: view.status,
    tab: view.tab,
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

export function presentCoachCheckIn(view: CoachCheckInView): CoachCheckIn {
  return {
    ...presentCheckIn(view),
    clientId: view.clientId,
    client: {
      firstName: view.client.firstName,
      lastName: view.client.lastName,
    },
  };
}

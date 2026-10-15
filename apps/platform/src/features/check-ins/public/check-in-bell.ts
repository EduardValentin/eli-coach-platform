import { z } from "zod";

export const CHECK_IN_BELL_KINDS = {
  requested: "check-in.requested",
  withdrawn: "check-in.withdrawn",
  approved: "check-in.approved",
  declined: "check-in.declined",
  newTimeProposed: "check-in.new-time-proposed",
  newTimeAccepted: "check-in.new-time-accepted",
  newTimeDeclined: "check-in.new-time-declined",
  cancelled: "check-in.cancelled",
  seriesSetUp: "check-in.series-set-up",
  seriesChanged: "check-in.series-changed",
  seriesStopped: "check-in.series-stopped",
  seriesClashes: "check-in.series-clashes",
  requestExpired: "check-in.request-expired",
  newTimeExpired: "check-in.new-time-expired",
  clashMissed: "check-in.clash-missed",
} as const;

export type CheckInBellKind =
  (typeof CHECK_IN_BELL_KINDS)[keyof typeof CHECK_IN_BELL_KINDS];

const checkInMomentFactsSchema = z.object({
  checkInId: z.uuid(),
  startsAt: z.iso.datetime(),
  clientName: z.string().min(1).optional(),
});

const seriesWeekFactsSchema = z.object({
  firstWeekId: z.uuid().optional(),
  firstWeekStartsAt: z.iso.datetime(),
});

const seriesStoppedFactsSchema = z.object({});

const seriesClashesFactsSchema = z.object({
  clientName: z.string().min(1),
  clashes: z.number().int().positive(),
  earliestId: z.uuid(),
  earliestStartsAt: z.iso.datetime(),
});

export const CHECK_IN_BELL_FACTS = {
  [CHECK_IN_BELL_KINDS.requested]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.withdrawn]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.approved]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.declined]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.newTimeProposed]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.newTimeAccepted]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.newTimeDeclined]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.cancelled]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.seriesSetUp]: seriesWeekFactsSchema,
  [CHECK_IN_BELL_KINDS.seriesChanged]: seriesWeekFactsSchema,
  [CHECK_IN_BELL_KINDS.seriesStopped]: seriesStoppedFactsSchema,
  [CHECK_IN_BELL_KINDS.seriesClashes]: seriesClashesFactsSchema,
  [CHECK_IN_BELL_KINDS.requestExpired]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.newTimeExpired]: checkInMomentFactsSchema,
  [CHECK_IN_BELL_KINDS.clashMissed]: checkInMomentFactsSchema,
} as const satisfies Record<CheckInBellKind, z.ZodType>;

import {
  HEIGHT_UNITS,
  WEIGHT_UNITS,
  type UnitPreferenceSnapshot,
} from "@eli-coach-platform/domain/unit-preference";
import { z } from "zod";

export const unitPreferenceSchema = z.object({
  weightUnit: z.enum(WEIGHT_UNITS),
  heightUnit: z.enum(HEIGHT_UNITS),
}) satisfies z.ZodType<UnitPreferenceSnapshot>;

export const unitPreferenceRefusalSchema = z.object({
  error: z.literal("not-on-journey"),
});

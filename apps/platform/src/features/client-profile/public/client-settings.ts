import { z } from "zod";

import { clientPreferencesSchema } from "./client-profile";
import { unitPreferenceSchema } from "./unit-preference";

export const clientSettingsSchema = clientPreferencesSchema.extend({
  units: unitPreferenceSchema,
});

export type ClientSettingsView = z.infer<typeof clientSettingsSchema>;

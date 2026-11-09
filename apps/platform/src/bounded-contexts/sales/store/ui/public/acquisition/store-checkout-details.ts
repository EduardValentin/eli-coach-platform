import { z } from "zod";

import { storeAcquisitionFormSchema } from "~/bounded-contexts/sales/store/public/store";

export const storeCheckoutDetailsFormSchema = storeAcquisitionFormSchema.extend(
  { deliveryConsent: z.boolean() },
);

export type StoreCheckoutDetails = z.infer<
  typeof storeCheckoutDetailsFormSchema
>;

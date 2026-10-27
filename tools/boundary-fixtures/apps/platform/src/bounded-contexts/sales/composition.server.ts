import { target as storeComposition } from "~/bounded-contexts/sales/store/composition.server";
import { target as storeKey } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";

export const target = [storeComposition, storeKey];

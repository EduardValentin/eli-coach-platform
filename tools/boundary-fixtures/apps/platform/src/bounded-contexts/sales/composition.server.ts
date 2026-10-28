import { target as t0 } from "~/bounded-contexts/sales/store/composition.server";
import { target as t1 } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";

export const probe = [t0, t1];

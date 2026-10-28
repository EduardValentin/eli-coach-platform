import { target as t0 } from "~/bounded-contexts/sales/composition.server";
import { target as t1 } from "~/bounded-contexts/sales/public/paths";
import { probe as t2 } from "~/bounded-contexts/sales/routes";
import { target as t3 } from "~/bounded-contexts/sales/waitlist/config.server";

export const probe = [t0, t1, t2, t3];

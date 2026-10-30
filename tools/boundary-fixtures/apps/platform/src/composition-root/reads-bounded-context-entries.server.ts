import { target as t0 } from "~/bounded-contexts/sales/public/paths";
import { probe as t1 } from "~/bounded-contexts/sales/routes";
import { target as t2 } from "~/bounded-contexts/sales/waitlist/config.server";

export const probe = [t0, t1, t2];

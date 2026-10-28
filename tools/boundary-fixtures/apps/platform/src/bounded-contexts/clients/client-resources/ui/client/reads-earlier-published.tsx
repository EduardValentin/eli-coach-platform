import { target as t0 } from "~/bounded-contexts/access/public/session";
import { target as t1 } from "~/bounded-contexts/access/accounts/public/account";
import { target as t2 } from "~/bounded-contexts/access/accounts/ui/shared/sign-out-control";

export const probe = [t0, t1, t2];

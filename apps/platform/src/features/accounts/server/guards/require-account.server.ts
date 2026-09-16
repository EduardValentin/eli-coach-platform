import type { Account, AccountRole } from "@eli-coach-platform/domain";
import type { LoaderFunctionArgs } from "react-router";

import { sessionContext } from "./session-context.server";

type RequireApiAccountOptions = {
  role?: AccountRole;
};

export function requireApiAccount(
  args: LoaderFunctionArgs,
  options?: RequireApiAccountOptions,
): Account {
  const session = args.context.get(sessionContext);

  if (session.kind === "anonymous") {
    throw Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { account } = session;

  if (options?.role && account.role !== options.role) {
    throw Response.json({ error: "forbidden" }, { status: 403 });
  }

  return account;
}

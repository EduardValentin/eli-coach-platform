import type { LoaderFunctionArgs } from "react-router";

import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";

export async function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(checkInsContext)
    .checkInJoin.resolveForClient(args, args.params.checkInId);
}

export default function ClientCheckInJoinRoute() {
  return (
    <main aria-label="Your check-in">
      <h1>Your check-in link isn&apos;t ready yet</h1>
    </main>
  );
}

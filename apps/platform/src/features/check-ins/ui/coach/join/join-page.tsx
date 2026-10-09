import type { LoaderFunctionArgs } from "react-router";

import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";

export async function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(checkInsContext)
    .checkInJoin.resolveForCoach(args, args.params.checkInId);
}

export default function CoachCheckInJoinRoute() {
  return <h1>Your meeting link isn&apos;t set yet</h1>;
}

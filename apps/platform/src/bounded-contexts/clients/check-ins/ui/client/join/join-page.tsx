import { DeadEndLink, DeadEndPage } from "~/shared/design-system/layout";
import { VideoOff } from "lucide-react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { CLIENT_CHECK_INS_PATH } from "~/bounded-contexts/clients/check-ins/public/paths";
import { checkInsContext } from "~/bounded-contexts/clients/check-ins/server/guards/check-ins-context.server";

export async function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(checkInsContext)
    .checkInJoin.resolveForClient(args, args.params.checkInId);
}

export const meta: MetaFunction = () => [
  { title: "Check-in link not ready | Evoa" },
];

export default function ClientCheckInJoinRoute() {
  return (
    <DeadEndPage
      data-parity-root="CheckinJoinNotReady"
      description="The meeting room for this check-in hasn't been set up yet. Check back closer to the time."
      icon={<VideoOff aria-hidden="true" size={36} />}
      landmarkLabel="Your check-in"
      title="Your check-in link isn't ready yet"
    >
      <DeadEndLink direction="back" to={CLIENT_CHECK_INS_PATH}>
        Back to check-ins
      </DeadEndLink>
    </DeadEndPage>
  );
}

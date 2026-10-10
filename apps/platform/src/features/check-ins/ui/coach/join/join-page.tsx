import { DeadEndLink, DeadEndPage } from "@eli-coach-platform/ui/layout";
import { VideoOff } from "lucide-react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import { COACH_SETTINGS_PATH } from "~/features/coach-schedule/public/paths";

export async function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(checkInsContext)
    .checkInJoin.resolveForCoach(args, args.params.checkInId);
}

export const meta: MetaFunction = () => [
  { title: "Meeting link not set | Evoa" },
];

export default function CoachCheckInJoinRoute() {
  return (
    <DeadEndPage
      data-parity-root="CheckinJoinNotReady"
      description="You haven't saved a meeting link yet. Add it in Settings so you and your client can join."
      icon={<VideoOff aria-hidden="true" size={36} />}
      landmarkLabel="Your check-in"
      title="Your meeting link isn't set yet"
    >
      <DeadEndLink direction="forward" to={COACH_SETTINGS_PATH}>
        Go to Settings
      </DeadEndLink>
    </DeadEndPage>
  );
}

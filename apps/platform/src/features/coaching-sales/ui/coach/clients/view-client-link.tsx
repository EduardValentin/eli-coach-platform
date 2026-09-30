import { RowActionLink } from "@eli-coach-platform/ui/appointments";
import { UserRound } from "lucide-react";

import { coachClientPath } from "~/features/coaching-sales/contracts/paths";

export function ViewClientLink({ clientId }: { clientId: string }) {
  return (
    <RowActionLink
      className="w-full md:w-auto"
      icon={UserRound}
      to={coachClientPath(clientId)}
    >
      View client
    </RowActionLink>
  );
}

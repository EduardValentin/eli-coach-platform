import { RowActionLink } from "~/shared/design-system/appointments";
import { UserRound } from "lucide-react";

import { coachClientPath } from "~/bounded-contexts/clients/clients/public/paths";

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

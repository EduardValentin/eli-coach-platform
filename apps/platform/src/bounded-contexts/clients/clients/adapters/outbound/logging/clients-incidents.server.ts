import type { ClientRosterIncidents } from "~/bounded-contexts/clients/clients/domain/client-roster";
import type { Logger } from "~/shared/logging/console-logger.server";
import { errorClassOf } from "~/shared/logging/error-fields.server";

export function createClientsIncidents(logger: Logger): ClientRosterIncidents {
  return {
    rosterReadFailed: (error) => {
      logger.error("Client roster could not be read.", {
        errorCategory: "client_roster_read_failure",
        errorClass: errorClassOf(error),
      });
    },
  };
}

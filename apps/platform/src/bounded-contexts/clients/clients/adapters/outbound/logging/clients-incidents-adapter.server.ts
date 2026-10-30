import type { ClientRosterIncidentsPort } from "~/bounded-contexts/clients/clients/domain/client-roster";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { errorClassOf } from "~/shared/logging/error-fields.server";

export class ClientsIncidentsAdapter implements ClientRosterIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  rosterReadFailed(error: unknown) {
    this.logger.error("Client roster could not be read.", {
      errorCategory: "client_roster_read_failure",
      errorClass: errorClassOf(error),
    });
  }
}

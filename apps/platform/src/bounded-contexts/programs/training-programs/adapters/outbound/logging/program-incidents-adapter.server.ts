import type { ProgramIncidentsPort } from "~/bounded-contexts/programs/training-programs/domain/program";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export class ProgramIncidentsAdapter implements ProgramIncidentsPort {
  constructor(private readonly loggerPort: LoggerPort) {}

  programStartFailed({
    clientId,
    error,
  }: Parameters<ProgramIncidentsPort["programStartFailed"]>[0]) {
    this.loggerPort.error("Program could not be started; nothing was saved.", {
      clientId,
      errorCategory: "program_start_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
    });
  }
}

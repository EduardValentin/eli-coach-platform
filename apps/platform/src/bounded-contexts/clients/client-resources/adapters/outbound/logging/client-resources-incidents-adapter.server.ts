import type { ClientResourceIncidentsPort } from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export class ClientResourcesIncidentsAdapter implements ClientResourceIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  resourceAccessRefused({
    clientId,
    requesterRole,
    resourceId,
  }: Parameters<ClientResourceIncidentsPort["resourceAccessRefused"]>[0]) {
    this.logger.warn("Client resource access refused.", {
      clientId,
      eventCategory: "client_resource_access_refused",
      requesterRole,
      resourceId,
    });
  }

  resourceRefused({
    clientId,
    reason,
    receivedBytes,
  }: Parameters<ClientResourceIncidentsPort["resourceRefused"]>[0]) {
    this.logger.warn("Client resource refused.", {
      clientId,
      eventCategory: "client_resource_refused",
      reason,
      receivedBytes,
    });
  }

  resourceChangeFailed({
    clientId,
    error,
    resourceId,
  }: Parameters<ClientResourceIncidentsPort["resourceChangeFailed"]>[0]) {
    this.logger.error("Client resource change could not be written.", {
      clientId,
      errorCategory: "client_resource_change_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      resourceId,
    });
  }

  resourceFilesOrphaned({
    clientId,
    error,
    resourceId,
  }: Parameters<ClientResourceIncidentsPort["resourceFilesOrphaned"]>[0]) {
    this.logger.error(
      "Client resource files were left behind after its removal.",
      {
        clientId,
        errorCategory: "client_resource_files_orphaned",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        resourceId,
      },
    );
  }

  resourceListingFailed({
    clientId,
    error,
  }: Parameters<ClientResourceIncidentsPort["resourceListingFailed"]>[0]) {
    this.logger.error("Client resources could not be listed.", {
      clientId,
      errorCategory: "client_resource_listing_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
    });
  }

  resourceOpeningFailed({
    clientId,
    error,
    resourceId,
  }: Parameters<ClientResourceIncidentsPort["resourceOpeningFailed"]>[0]) {
    this.logger.error("Client resource opening could not be recorded.", {
      clientId,
      errorCategory: "client_resource_opening_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      resourceId,
    });
  }

  resourceStorageFailed({
    clientId,
    error,
    resourceId,
  }: Parameters<ClientResourceIncidentsPort["resourceStorageFailed"]>[0]) {
    this.logger.error("Client resource could not be stored.", {
      clientId,
      errorCategory: "client_resource_storage_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      resourceId,
    });
  }

  resourceStored({
    clientId,
    format,
    pageCount,
    resourceId,
    sizeBytes,
  }: Parameters<ClientResourceIncidentsPort["resourceStored"]>[0]) {
    this.logger.info("Client resource stored.", {
      clientId,
      eventCategory: "client_resource_stored",
      format,
      pageCount,
      resourceId,
      sizeBytes,
    });
  }

  unopenedCountFailed({
    clientId,
    error,
  }: Parameters<ClientResourceIncidentsPort["unopenedCountFailed"]>[0]) {
    this.logger.error("Unopened client resources could not be counted.", {
      clientId,
      errorCategory: "client_resource_unopened_count_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
    });
  }
}

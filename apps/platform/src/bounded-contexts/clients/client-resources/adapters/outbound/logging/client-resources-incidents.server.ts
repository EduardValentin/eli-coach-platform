import type { ClientResourceIncidents } from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import type { Logger } from "~/shared/logging/console-logger.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export function createClientResourcesIncidents(
  logger: Logger,
): ClientResourceIncidents {
  return {
    resourceAccessRefused: ({ clientId, requesterRole, resourceId }) => {
      logger.warn("Client resource access refused.", {
        clientId,
        eventCategory: "client_resource_access_refused",
        requesterRole,
        resourceId,
      });
    },
    resourceRefused: ({ clientId, reason, receivedBytes }) => {
      logger.warn("Client resource refused.", {
        clientId,
        eventCategory: "client_resource_refused",
        reason,
        receivedBytes,
      });
    },
    resourceChangeFailed: ({ clientId, error, resourceId }) => {
      logger.error("Client resource change could not be written.", {
        clientId,
        errorCategory: "client_resource_change_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        resourceId,
      });
    },
    resourceFilesOrphaned: ({ clientId, error, resourceId }) => {
      logger.error(
        "Client resource files were left behind after its removal.",
        {
          clientId,
          errorCategory: "client_resource_files_orphaned",
          errorClass: errorClassOf(error),
          ...errorCodeOf(error),
          resourceId,
        },
      );
    },
    resourceListingFailed: ({ clientId, error }) => {
      logger.error("Client resources could not be listed.", {
        clientId,
        errorCategory: "client_resource_listing_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
      });
    },
    resourceOpeningFailed: ({ clientId, error, resourceId }) => {
      logger.error("Client resource opening could not be recorded.", {
        clientId,
        errorCategory: "client_resource_opening_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        resourceId,
      });
    },
    resourceStorageFailed: ({ clientId, error, resourceId }) => {
      logger.error("Client resource could not be stored.", {
        clientId,
        errorCategory: "client_resource_storage_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        resourceId,
      });
    },
    resourceStored: ({
      clientId,
      format,
      pageCount,
      resourceId,
      sizeBytes,
    }) => {
      logger.info("Client resource stored.", {
        clientId,
        eventCategory: "client_resource_stored",
        format,
        pageCount,
        resourceId,
        sizeBytes,
      });
    },
    unopenedCountFailed: ({ clientId, error }) => {
      logger.error("Unopened client resources could not be counted.", {
        clientId,
        errorCategory: "client_resource_unopened_count_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
      });
    },
  };
}

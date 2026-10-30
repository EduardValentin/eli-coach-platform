import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { ClientResourcesIncidentsAdapter } from "./client-resources-incidents-adapter.server";

describe("ClientResourcesIncidentsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a stored client resource by ids, format, size and page count only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    clientResourcesIncidentsAdapter.resourceStored({
      clientId: "client-1",
      resourceId: "resource-1",
      format: "pdf",
      sizeBytes: 182_431,
      pageCount: 3,
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Client resource stored.", {
      clientId: "client-1",
      eventCategory: "client_resource_stored",
      format: "pdf",
      pageCount: 3,
      resourceId: "resource-1",
      sizeBytes: 182_431,
    });
  });

  it("logs a refused client resource by client, byte count and reason only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    clientResourcesIncidentsAdapter.resourceRefused({
      clientId: "client-1",
      receivedBytes: 12,
      reason: "unsupported-type",
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith("Client resource refused.", {
      clientId: "client-1",
      eventCategory: "client_resource_refused",
      reason: "unsupported-type",
      receivedBytes: 12,
    });
  });

  it("logs a refused client resource request by requester role and ids only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    clientResourcesIncidentsAdapter.resourceAccessRefused({
      requesterRole: "CLIENT",
      clientId: "client-1",
      resourceId: null,
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith(
      "Client resource access refused.",
      {
        clientId: "client-1",
        eventCategory: "client_resource_access_refused",
        requesterRole: "CLIENT",
        resourceId: null,
      },
    );
  });

  it("logs a client resource that could not be stored by ids and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(
      new Error("ENOSPC: no space left on device, open 'Meal plan.pdf'"),
      { code: "ENOSPC" },
    );

    // act
    clientResourcesIncidentsAdapter.resourceStorageFailed({
      clientId: "client-1",
      resourceId: "resource-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client resource could not be stored.",
      {
        clientId: "client-1",
        errorCategory: "client_resource_storage_failure",
        errorClass: "Error",
        errorCode: "ENOSPC",
        resourceId: "resource-1",
      },
    );
  });

  it("logs a client's resources that could not be listed by id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(
      new Error("connect ECONNREFUSED 10.0.0.5:5432 user=platform"),
      { code: "ECONNREFUSED" },
    );

    // act
    clientResourcesIncidentsAdapter.resourceListingFailed({
      clientId: "client-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client resources could not be listed.",
      {
        clientId: "client-1",
        errorCategory: "client_resource_listing_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
      },
    );
  });

  it("logs a resource she opened whose mark could not be kept by its ids and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    clientResourcesIncidentsAdapter.resourceOpeningFailed({
      clientId: "client-1",
      resourceId: "resource-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client resource opening could not be recorded.",
      {
        clientId: "client-1",
        errorCategory: "client_resource_opening_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
        resourceId: "resource-1",
      },
    );
  });

  it("logs a client resource change that could not be written by its ids and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    clientResourcesIncidentsAdapter.resourceChangeFailed({
      clientId: "client-1",
      resourceId: "resource-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client resource change could not be written.",
      {
        clientId: "client-1",
        errorCategory: "client_resource_change_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
        resourceId: "resource-1",
      },
    );
  });

  it("logs the files a removed client resource left behind by its ids and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(
      new Error("EACCES: permission denied, rmdir '/resources/client-1'"),
      { code: "EACCES" },
    );

    // act
    clientResourcesIncidentsAdapter.resourceFilesOrphaned({
      clientId: "client-1",
      resourceId: "resource-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client resource files were left behind after its removal.",
      {
        clientId: "client-1",
        errorCategory: "client_resource_files_orphaned",
        errorClass: "Error",
        errorCode: "EACCES",
        resourceId: "resource-1",
      },
    );
  });

  it.each([
    ["her client", "client-1"],
    ["no client, when hers could not be read", null],
  ])(
    "logs an unopened count that could not be read with %s and the class of its cause only",
    (_case, clientId) => {
      // arrange
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const clientResourcesIncidentsAdapter =
        new ClientResourcesIncidentsAdapter(new ConsoleLoggerAdapter());

      // act
      clientResourcesIncidentsAdapter.unopenedCountFailed({
        clientId,
        error: new TypeError("secret row contents"),
      });

      // assert
      expect(consoleError).toHaveBeenCalledWith(
        "Unopened client resources could not be counted.",
        {
          clientId,
          errorCategory: "client_resource_unopened_count_failure",
          errorClass: "TypeError",
        },
      );
    },
  );

  it("logs a client resource storage failure whose cause has no code by its class alone", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    clientResourcesIncidentsAdapter.resourceStorageFailed({
      clientId: "client-1",
      resourceId: "resource-1",
      error: new TypeError("page renderer stopped"),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client resource could not be stored.",
      {
        clientId: "client-1",
        errorCategory: "client_resource_storage_failure",
        errorClass: "TypeError",
        resourceId: "resource-1",
      },
    );
  });
});
